from flask import Flask, request, jsonify, redirect, send_from_directory, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import click, os
from datetime import datetime, date

app = Flask(__name__)

# ---- Configuração básica ----
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "segredo_guias_viseu")
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///database.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
# (opcional) cookies de sessão mais seguros
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

db = SQLAlchemy(app)

# -------------------------
# MODELOS
# -------------------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    def set_password(self, pw): self.password_hash = generate_password_hash(pw)
    def check_password(self, pw): return check_password_hash(self.password_hash, pw)

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
    created_at = db.Column(db.String(60))  # ISO: "YYYY-MM-DDTHH:MM:SS.sssZ" ou local

class SiteConfig(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    orders_start = db.Column(db.String(25))  # "YYYY-MM-DD"
    orders_end   = db.Column(db.String(25))

# -------------------------
# UTIL
# -------------------------
def is_logged_in():
    return "user_id" in session

def in_period():
    """Define se encomendas estão abertas. Se não definires datas, permite por omissão."""
    cfg = SiteConfig.query.first()
    if not cfg or not cfg.orders_start or not cfg.orders_end:
        return True
    today = date.today().isoformat()
    return cfg.orders_start <= today <= cfg.orders_end

# -------------------------
# ROTAS PÚBLICAS (ficheiros)
# -------------------------
@app.route("/")
def root_index():
    return send_from_directory(".", "index.html")

# Serve ficheiros estáticos da raiz, mas evita abrir admin.html diretamente
@app.route("/<path:filename>")
def static_files(filename):
    if filename.lower() == "admin.html":
        return redirect("/admin")
    return send_from_directory(".", filename)

# Página de login (ficheiro)
@app.route("/login.html")
def login_page():
    return send_from_directory(".", "login.html")

# -------------------------
# ROTA PROTEGIDA PARA O ADMIN
# -------------------------
@app.route("/admin")
def admin_page():
    if not is_logged_in():
        return redirect("/login.html")
    return send_from_directory(".", "admin.html")

# -------------------------
# API DE CONFIG (datas de encomenda)
# -------------------------
@app.route("/api/config", methods=["GET"])
def get_config():
    cfg = SiteConfig.query.first()
    if not cfg:
        return jsonify({"orders_start": None, "orders_end": None})
    return jsonify({
        "orders_start": cfg.orders_start,
        "orders_end": cfg.orders_end
    })

@app.route("/api/config", methods=["POST"])
def set_config():
    if not is_logged_in():
        return jsonify({"error": "Não autorizado"}), 401
    data = request.get_json() or {}
    cfg = SiteConfig.query.first()
    if not cfg:
        cfg = SiteConfig()
        db.session.add(cfg)
    if "orders_start" in data:
        cfg.orders_start = data["orders_start"] or None
    if "orders_end" in data:
        cfg.orders_end = data["orders_end"] or None
    db.session.commit()
    return jsonify({"ok": True})

# -------------------------
# API DE PEDIDOS
# -------------------------
@app.route("/api/orders", methods=["POST"])
def add_order():
    try:
        data = request.get_json()

        print("🔵 DADOS RECEBIDOS:", data)  # 👈 DEBUG (ver nos logs do Koyeb)

        if not data:
            return jsonify({"ok": False, "error": "Pedido vazio"}), 400

        # 🔴 remover bloqueio de datas (para não dar erro agora)
        # if not in_period():
        #     return jsonify({"ok": False, "error": "Fora do período"}), 403

        preco = data.get("preco_unit") or data.get("preco") or 0

        novo = Pedido(
            nome=data.get("nome") or "",
            email=data.get("email") or "",
            ramo=data.get("ramo") or "",
            produto=data.get("produto") or "",
            tamanho=data.get("tamanho") or "",
            quantidade=int(data.get("quantidade") or 1),
            preco=float(preco),
            especialidade=data.get("especialidade") or "",
            created_at=datetime.utcnow().isoformat()
        )

        db.session.add(novo)
        db.session.commit()

        return jsonify({"ok": True, "order_id": novo.id}), 200

    except Exception as e:
        print("❌ ERRO NO BACKEND:", e)
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/api/orders", methods=["GET"])
def get_orders():
    if not is_logged_in():
        return jsonify({"error": "Não autorizado"}), 401

    q = Pedido.query

    # filtros opcionais por data (YYYY-MM-DD)
    start = request.args.get("start")
    end   = request.args.get("end")

    if start:
        q = q.filter(Pedido.created_at >= f"{start}")
    if end:
        q = q.filter(Pedido.created_at <= f"{end}T23:59:59")

    pedidos = q.order_by(Pedido.id.desc()).all()
    return jsonify([{
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
    } for p in pedidos])
@app.route("/api/orders/clear", methods=["POST"])
def clear_orders():
    if not is_logged_in():
        return jsonify({"error": "Não autorizado"}), 401
    Pedido.query.delete()
    db.session.commit()
    return jsonify({"ok": True})

# -------------------------
# LOGIN / LOGOUT
# -------------------------
@app.route("/login", methods=["POST"])
def login():
    # Se vier form-urlencoded (do login.html)
    username = request.form.get("username")
    password = request.form.get("password")

    # (se quiseres aceitar JSON também:)
    if not username and request.is_json:
        data = request.get_json(silent=True) or {}
        username = data.get("username")
        password = data.get("password")

    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        session["user_id"] = user.id
        session["username"] = user.username
        return redirect("/admin")  # frontend deve seguir para /admin
    return "Credenciais inválidas", 401

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/login.html")

# -------------------------
# CLI: CRIAR ADMIN
# -------------------------
@app.cli.command("create-admin")
@click.option("--username", prompt=True, help="Nome de utilizador")
@click.option("--password", prompt=True, hide_input=True, confirmation_prompt=True)
def create_admin(username, password):
    with app.app_context():
        db.create_all()
        if User.query.filter_by(username=username).first():
            click.echo("⚠️ Já existe um utilizador com esse nome.")
            return
        u = User(username=username)
        u.set_password(password)
        db.session.add(u)
        db.session.commit()
        click.echo(f"✅ Utilizador '{username}' criado com sucesso.")

# -------------------------
# INÍCIO
# -------------------------
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        # cria configuração vazia caso não exista
        if SiteConfig.query.first() is None:
            db.session.add(SiteConfig(orders_start=None, orders_end=None))
            db.session.commit()
    app.run(debug=True)
if __name__ == "__main__":
    import os
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
