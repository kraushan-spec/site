from flask import Blueprint, flash, redirect, render_template, request, url_for

from app.decorators import roles_required
from app.extensions import db
from app.forms import DepartmentForm, UserForm
from app.models import ROLE_ADMIN, Department, User

bp = Blueprint("admin", __name__, url_prefix="/admin")


@bp.route("/users")
@roles_required(ROLE_ADMIN)
def users():
    all_users = User.query.order_by(User.full_name).all()
    return render_template("admin/users.html", users=all_users)


@bp.route("/users/new", methods=["GET", "POST"])
@roles_required(ROLE_ADMIN)
def new_user():
    form = UserForm()
    form.department_id.choices = [(0, "—")] + [
        (d.id, d.name) for d in Department.query.order_by(Department.name).all()
    ]

    if form.validate_on_submit():
        if not form.password.data:
            form.password.errors.append("Пароль обязателен для нового пользователя")
        elif User.query.filter_by(login=form.login.data.strip()).first():
            form.login.errors.append("Такой логин уже занят")
        else:
            user = User(
                full_name=form.full_name.data.strip(),
                login=form.login.data.strip(),
                role=form.role.data,
                department_id=form.department_id.data or None,
                is_active_flag=form.is_active_flag.data,
            )
            user.set_password(form.password.data)
            db.session.add(user)
            db.session.commit()
            flash("Пользователь создан", "success")
            return redirect(url_for("admin.users"))

    return render_template("admin/user_form.html", form=form, user=None)


@bp.route("/users/<int:user_id>/edit", methods=["GET", "POST"])
@roles_required(ROLE_ADMIN)
def edit_user(user_id):
    user = User.query.get_or_404(user_id)
    form = UserForm(obj=user)
    form.department_id.choices = [(0, "—")] + [
        (d.id, d.name) for d in Department.query.order_by(Department.name).all()
    ]
    if request.method == "GET":
        form.department_id.data = user.department_id or 0

    if form.validate_on_submit():
        existing = User.query.filter_by(login=form.login.data.strip()).first()
        if existing and existing.id != user.id:
            form.login.errors.append("Такой логин уже занят")
        else:
            user.full_name = form.full_name.data.strip()
            user.login = form.login.data.strip()
            user.role = form.role.data
            user.department_id = form.department_id.data or None
            user.is_active_flag = form.is_active_flag.data
            if form.password.data:
                user.set_password(form.password.data)
            db.session.commit()
            flash("Пользователь обновлён", "success")
            return redirect(url_for("admin.users"))

    return render_template("admin/user_form.html", form=form, user=user)


@bp.route("/departments")
@roles_required(ROLE_ADMIN)
def departments():
    all_departments = Department.query.order_by(Department.name).all()
    return render_template("admin/departments.html", departments=all_departments)


@bp.route("/departments/new", methods=["GET", "POST"])
@roles_required(ROLE_ADMIN)
def new_department():
    form = DepartmentForm()
    if form.validate_on_submit():
        if Department.query.filter_by(name=form.name.data.strip()).first():
            form.name.errors.append("Подразделение с таким названием уже есть")
        else:
            db.session.add(Department(name=form.name.data.strip()))
            db.session.commit()
            flash("Подразделение создано", "success")
            return redirect(url_for("admin.departments"))
    return render_template("admin/department_form.html", form=form, department=None)


@bp.route("/departments/<int:department_id>/edit", methods=["GET", "POST"])
@roles_required(ROLE_ADMIN)
def edit_department(department_id):
    department = Department.query.get_or_404(department_id)
    form = DepartmentForm(obj=department)
    if form.validate_on_submit():
        existing = Department.query.filter_by(name=form.name.data.strip()).first()
        if existing and existing.id != department.id:
            form.name.errors.append("Подразделение с таким названием уже есть")
        else:
            department.name = form.name.data.strip()
            db.session.commit()
            flash("Подразделение обновлено", "success")
            return redirect(url_for("admin.departments"))
    return render_template("admin/department_form.html", form=form, department=department)
