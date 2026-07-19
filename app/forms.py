from flask_wtf import FlaskForm
from flask_wtf.file import FileField
from wtforms import (
    BooleanField, DateTimeField, PasswordField, SelectField, StringField,
    SubmitField, TextAreaField,
)
from wtforms.validators import DataRequired, Length, Optional

from app.models import (
    IMPORTANCE_LABELS, ROLE_LABELS, TASK_TYPE_LABELS,
)


class LoginForm(FlaskForm):
    login = StringField("Логин", validators=[DataRequired()])
    password = PasswordField("Пароль", validators=[DataRequired()])
    submit_btn = SubmitField("Войти")


class TaskForm(FlaskForm):
    title = StringField("Название", validators=[DataRequired(), Length(max=500)])
    task_type = SelectField("Тип задачи", choices=list(TASK_TYPE_LABELS.items()))
    department_id = SelectField("Подразделение", coerce=int)
    assignee_id = SelectField("Исполнитель", coerce=int)
    backup_assignee_id = SelectField("Замещающий исполнитель", coerce=int, validators=[Optional()])
    deadline = DateTimeField("Срок исполнения", format="%Y-%m-%dT%H:%M", validators=[DataRequired()])
    importance = SelectField("Важность", choices=list(IMPORTANCE_LABELS.items()))
    submit_btn = SubmitField("Сохранить")


class CommentForm(FlaskForm):
    body = TextAreaField("Комментарий", validators=[DataRequired()])
    submit_btn = SubmitField("Отправить")


class AttachmentForm(FlaskForm):
    file = FileField("Файл", validators=[DataRequired()])
    submit_btn = SubmitField("Загрузить")


class UserForm(FlaskForm):
    full_name = StringField("ФИО", validators=[DataRequired(), Length(max=255)])
    login = StringField("Логин", validators=[DataRequired(), Length(max=80)])
    password = PasswordField(
        "Пароль",
        validators=[Optional(), Length(min=4, message="Минимум 4 символа")],
    )
    role = SelectField("Роль", choices=list(ROLE_LABELS.items()))
    department_id = SelectField("Подразделение", coerce=int, validators=[Optional()])
    is_active_flag = BooleanField("Активен", default=True)
    submit_btn = SubmitField("Сохранить")


class DepartmentForm(FlaskForm):
    name = StringField("Название подразделения", validators=[DataRequired(), Length(max=255)])
    submit_btn = SubmitField("Сохранить")
