import os

from flask import Flask

from config import Config


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    os.makedirs(os.path.join(config_class.BASE_DIR, "instance"), exist_ok=True)
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    from app.extensions import db, login_manager

    db.init_app(app)
    login_manager.init_app(app)

    from app.models import User

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))

    from app.auth import bp as auth_bp
    from app.tasks import bp as tasks_bp
    from app.admin import bp as admin_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(admin_bp)

    from flask import redirect, url_for

    @app.route("/")
    def index():
        return redirect(url_for("tasks.list_tasks"))

    from app.models import (
        IMPORTANCE_LABELS, ROLE_LABELS, STATUS_COLORS, STATUS_LABELS,
        TASK_TYPE_COLORS, TASK_TYPE_LABELS,
    )

    @app.context_processor
    def inject_labels():
        return {
            "ROLE_LABELS": ROLE_LABELS,
            "TASK_TYPE_LABELS": TASK_TYPE_LABELS,
            "TASK_TYPE_COLORS": TASK_TYPE_COLORS,
            "IMPORTANCE_LABELS": IMPORTANCE_LABELS,
            "STATUS_LABELS": STATUS_LABELS,
            "STATUS_COLORS": STATUS_COLORS,
        }

    @app.cli.command("seed")
    def seed_command():
        from seed import run_seed
        run_seed(app)

    with app.app_context():
        db.create_all()

    return app
