from flask import Flask, request, jsonify, redirect, send_from_directory, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import click, os
from datetime import datetime

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "segredo_guias_viseu")
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///database.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
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
    nome = db.Column(db.String(120)); email = db.Column(db.String(120))
    ramo = db.Column(db.String(80)); produto = db.Column(db.String(200))
    tamanho = db.Column(db.String(80)); quantidade = db.Column(db.Integer)
    preco = db.Column(db.Float); especialidade = db.Column(db.String(200))
    created_at = db.Column(db.String(60))

# -------------------------
# UTIL
# -------------------------
def is_logged_in():
    return "user_id" in session

# -------------------------
# ROTAS PÚBLICAS (ficheiros)
# -------------------------
@app.route("/")
def index():
    return send_from_directory(".", "index.html")

# Serve ficheiros, mas bloqueia acesso direto a admin.html (usa /admin protegido)
@app.route("/<path:filename>")
def static_files(filename):
    if filename.lower() == "admin.html":
        return redirect("/admin")
    return send_from_directory(".", filename)

# Página de login (ficheiro do teu projeto)
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
    # Aqui devolvemos exatamente o teu admin.html
    return send_from_directory(".", "admin.html")

# -------------------------
# API DE PEDIDOS
# -------------------------
@app.route("/api/orders", methods=["POST"])
def add_order():
    data = request.get_json()
    if not data:
        return jsonify({"ok": False, "error": "Pedido inválido"}), 400

    preco = data.get("preco_unit")
    if preco is None:
        preco = data.get("preco") or 0

    novo = Pedido(
        nome = data.get("nome"),
        email = data.get("email"),
        ramo = data.get("ramo"),
        produto = data.get("produto"),
        tamanho = data.get("tamanho"),
        quantidade = int(data.get("quantidade") or 1),
        preco = float(preco or 0),
        especialidade = data.get("especialidade"),
        created_at = data.get("data") or datetime.utcnow().isoformat()
    )
    db.session.add(novo)
    db.session.commit()
    return jsonify({"ok": True, "order_id": novo.id}), 201

@app.route("/api/orders", methods=["GET"])
def get_orders():
    if not is_logged_in():
        return jsonify({"error": "Não autorizado"}), 401
    pedidos = Pedido.query.order_by(Pedido.id.desc()).all()
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

# -------------------------
# LOGIN / LOGOUT
# -------------------------
@app.route("/login", methods=["POST"])
def login():
    username = request.form.get("username")
    password = request.form.get("password")
    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        session["user_id"] = user.id
        session["username"] = user.username
        return redirect("/admin")   # vai para a rota protegida que serve o teu admin.html
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
# INICIO
# -------------------------
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
