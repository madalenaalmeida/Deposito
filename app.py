from flask import Flask, request, jsonify, redirect, send_from_directory, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import click
import os
from datetime import datetime, date

app = Flask(__name__)

# =========================================================
# CONFIGURAÇÃO BÁSICA
# =========================================================

app.config["SECRET_KEY"] = os.environ.get(
    "SECRET_KEY",
    "segredo_guias_viseu"
)

app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL",
    "sqlite:///database.db"
)

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Cookies de sessão mais seguros
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

db = SQLAlchemy(app)


# =========================================================
# MODELOS
# =========================================================

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    username = db.Column(
        db.String(120),
        unique=True,
        nullable=False
    )

    password_hash = db.Column(
        db.String(255),
        nullable=False
    )

    def set_password(self, pw):
        self.password_hash = generate_password_hash(pw)

    def check_password(self, pw):
        return check_password_hash(
            self.password_hash,
            pw
        )


class Pedido(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    nome = db.Column(db.String(120))
    email = db.Column(db.String(120))
    ramo = db.Column(db.String(80))
    produto = db.Column(db.String(200))
    tamanho = db.Column(db.String(80))
    quantidade = db.Column(db.Integer)
    preco = db.Column(db.Float)
    especialidade = db.Column(db.String(200))

    # ISO:
    # "YYYY-MM-DDTHH:MM:SS.sssZ"
    # ou data/hora local
    created_at = db.Column(db.String(60))


class SiteConfig(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    # Datas no formato YYYY-MM-DD
    orders_start = db.Column(db.String(25))
    orders_end = db.Column(db.String(25))


# =========================================================
# UTILITÁRIOS
# =========================================================

def is_logged_in():
    return "user_id" in session


def in_period():
    """
    Verifica se as encomendas estão atualmente abertas.

    Regras:
    - Sem configuração -> aberto
    - Sem data de início -> pode abrir imediatamente
    - Sem data de fim -> fica aberto indefinidamente
    - Dentro do período -> aberto
    - Fora do período -> fechado
    """

    cfg = SiteConfig.query.first()

    # Se não existir configuração,
    # assumimos que as encomendas estão abertas.
    if not cfg:
        return True

    today = date.today().isoformat()

    # Ainda não chegou a data de abertura
    if cfg.orders_start and today < cfg.orders_start:
        return False

    # Já passou a data de encerramento
    if cfg.orders_end and today > cfg.orders_end:
        return False

    return True


# =========================================================
# ROTAS PÚBLICAS — FICHEIROS
# =========================================================

@app.route("/")
def root_index():
    return send_from_directory(".", "index.html")


@app.route("/<path:filename>")
def static_files(filename):

    # Impede acesso direto ao admin.html
    if filename.lower() == "admin.html":
        return redirect("/admin")

    return send_from_directory(".", filename)


@app.route("/login.html")
def login_page():
    return send_from_directory(".", "login.html")


# =========================================================
# ADMIN
# =========================================================

@app.route("/admin")
def admin_page():

    if not is_logged_in():
        return redirect("/login.html")

    return send_from_directory(".", "admin.html")


# =========================================================
# API — CONFIGURAÇÃO DAS ENCOMENDAS
# =========================================================

@app.route("/api/config", methods=["GET"])
def get_config():

    cfg = SiteConfig.query.first()

    # Se ainda não existir configuração,
    # as encomendas estão abertas por defeito.
    if not cfg:
        return jsonify({
            "orders_start": None,
            "orders_end": None,
            "orders_open": True
        })

    return jsonify({
        "orders_start": cfg.orders_start,
        "orders_end": cfg.orders_end,
        "orders_open": in_period()
    })


@app.route("/api/config", methods=["POST"])
def set_config():

    # Apenas administrador pode alterar
    # as datas das encomendas.
    if not is_logged_in():
        return jsonify({
            "error": "Não autorizado"
        }), 401

    data = request.get_json() or {}

    cfg = SiteConfig.query.first()

    # Se não existir configuração,
    # cria uma nova.
    if not cfg:
        cfg = SiteConfig()
        db.session.add(cfg)

    # Atualizar data de início
    if "orders_start" in data:
        cfg.orders_start = (
            data["orders_start"]
            or None
        )

    # Atualizar data de fim
    if "orders_end" in data:
        cfg.orders_end = (
            data["orders_end"]
            or None
        )

    db.session.commit()

    return jsonify({
        "ok": True,
        "orders_start": cfg.orders_start,
        "orders_end": cfg.orders_end,
        "orders_open": in_period()
    })


# =========================================================
# API — PEDIDOS
# =========================================================

@app.route("/api/orders", methods=["POST"])
def add_order():

    try:

        data = request.get_json()

        print(
            "🔵 DADOS RECEBIDOS:",
            data
        )

        # Pedido vazio
        if not data:
            return jsonify({
                "ok": False,
                "error": "Pedido vazio"
            }), 400

        # =================================================
        # BLOQUEIO DAS ENCOMENDAS
        # =================================================

        if not in_period():
            return jsonify({
                "ok": False,
                "error": "As encomendas estão encerradas neste momento."
            }), 403

        # =================================================
        # PREÇO
        # =================================================

        preco = (
            data.get("preco_unit")
            or data.get("preco")
            or 0
        )

        # =================================================
        # CRIAR PEDIDO
        # =================================================

        novo = Pedido(

            nome=data.get("nome") or "",

            email=data.get("email") or "",

            ramo=data.get("ramo") or "",

            produto=data.get("produto") or "",

            tamanho=data.get("tamanho") or "",

            quantidade=int(
                data.get("quantidade") or 1
            ),

            preco=float(preco),

            especialidade=(
                data.get("especialidade")
                or ""
            ),

            created_at=datetime.utcnow().isoformat()
        )

        db.session.add(novo)

        db.session.commit()

        return jsonify({
            "ok": True,
            "order_id": novo.id
        }), 200

    except Exception as e:

        print(
            "❌ ERRO NO BACKEND:",
            e
        )

        return jsonify({
            "ok": False,
            "error": str(e)
        }), 500


# =========================================================
# API — CONSULTAR PEDIDOS
# =========================================================

@app.route("/api/orders", methods=["GET"])
def get_orders():

    if not is_logged_in():
        return jsonify({
            "error": "Não autorizado"
        }), 401

    q = Pedido.query

    # Filtros opcionais por data
    # YYYY-MM-DD
    start = request.args.get("start")
    end = request.args.get("end")

    if start:
        q = q.filter(
            Pedido.created_at >= f"{start}"
        )

    if end:
        q = q.filter(
            Pedido.created_at <= f"{end}T23:59:59"
        )

    pedidos = (
        q.order_by(
            Pedido.id.desc()
        ).all()
    )

    return jsonify([
        {
            "id": p.id,
            "nome": p.nome,
            "email": p.email,
            "ramo": p.ramo,
            "produto": p.produto,
            "tamanho": p.tamanho,
            "quantidade": p.quantidade,
            "preco": p.preco,
            "especialidade": p.especialidade,
            "data": p.created_at
        }

        for p in pedidos
    ])


# =========================================================
# API — APAGAR PEDIDOS
# =========================================================

@app.route("/api/orders/clear", methods=["POST"])
def clear_orders():

    if not is_logged_in():
        return jsonify({
            "error": "Não autorizado"
        }), 401

    Pedido.query.delete()

    db.session.commit()

    return jsonify({
        "ok": True
    })


# =========================================================
# LOGIN
# =========================================================

@app.route("/login", methods=["POST"])
def login():

    # Se vier form-urlencoded
    # (login.html)
    username = request.form.get(
        "username"
    )

    password = request.form.get(
        "password"
    )

    # Aceitar JSON também
    if not username and request.is_json:

        data = (
            request.get_json(
                silent=True
            )
            or {}
        )

        username = data.get(
            "username"
        )

        password = data.get(
            "password"
        )

    user = User.query.filter_by(
        username=username
    ).first()

    if user and user.check_password(
        password
    ):

        session["user_id"] = user.id

        session["username"] = (
            user.username
        )

        return redirect("/admin")

    return "Credenciais inválidas", 401


# =========================================================
# LOGOUT
# =========================================================

@app.route("/logout")
def logout():

    session.clear()

    return redirect("/login.html")


# =========================================================
# CLI — CRIAR ADMIN
# =========================================================

@app.cli.command("create-admin")
@click.option(
    "--username",
    prompt=True,
    help="Nome de utilizador"
)
@click.option(
    "--password",
    prompt=True,
    hide_input=True,
    confirmation_prompt=True
)
def create_admin(
    username,
    password
):

    with app.app_context():

        db.create_all()

        # Verificar se já existe
        if User.query.filter_by(
            username=username
        ).first():

            click.echo(
                "⚠️ Já existe um utilizador com esse nome."
            )

            return

        # Criar utilizador
        u = User(
            username=username
        )

        u.set_password(
            password
        )

        db.session.add(u)

        db.session.commit()

        click.echo(
            f"✅ Utilizador '{username}' criado com sucesso."
        )


# =========================================================
# INÍCIO DA APLICAÇÃO
# =========================================================

if __name__ == "__main__":

    with app.app_context():

        # Criar tabelas caso ainda não existam
        db.create_all()

        # Criar configuração inicial
        # caso ainda não exista.
        if SiteConfig.query.first() is None:

            db.session.add(
                SiteConfig(
                    orders_start=None,
                    orders_end=None
                )
            )

            db.session.commit()

    # Executar Flask
    app.run(
        host="0.0.0.0",
        port=int(
            os.environ.get(
                "PORT",
                8080
            )
        ),
        debug=True
    )