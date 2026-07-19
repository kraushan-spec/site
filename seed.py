import os

from app.extensions import db
from app.models import ROLE_ADMIN, Department, User

DEFAULT_DEPARTMENTS = [
    "Служба технической поддержки клиентов B2B/B2G",
    "Служба технической поддержки крупных корпоративных клиентов",
]


def run_seed(app):
    with app.app_context():
        db.create_all()

        for name in DEFAULT_DEPARTMENTS:
            if not Department.query.filter_by(name=name).first():
                db.session.add(Department(name=name))
        db.session.commit()

        admin_login = os.environ.get("ADMIN_LOGIN", "admin")
        admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")

        admin = User.query.filter_by(login=admin_login).first()
        if admin:
            print(f"Пользователь '{admin_login}' уже существует, пропускаю создание админа.")
        else:
            admin = User(
                full_name="Администратор",
                login=admin_login,
                role=ROLE_ADMIN,
                department_id=None,
                is_active_flag=True,
            )
            admin.set_password(admin_password)
            db.session.add(admin)
            db.session.commit()
            print(f"Создан админ: логин='{admin_login}', пароль='{admin_password}'")
            print("Смените пароль после первого входа через админку.")

        print("Стартовые подразделения готовы.")


if __name__ == "__main__":
    from app import create_app

    run_seed(create_app())
