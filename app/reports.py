import io
from datetime import datetime, time

import pandas as pd
from flask import Blueprint, render_template, send_file
from flask_login import current_user

from app.decorators import roles_required
from app.forms import ReportForm
from app.models import ROLE_ADMIN, ROLE_MANAGER, Task

bp = Blueprint("reports", __name__, url_prefix="/reports")

COLUMN_LABELS = {
    "department": "Подразделение",
    "employee": "Сотрудник",
    "on_time_count": "Вовремя",
    "late_count": "Просрочено",
    "total": "Всего",
}


def _aggregate(df, group_cols):
    result_cols = group_cols + ["on_time_count", "late_count", "total"]
    if df.empty:
        return pd.DataFrame(columns=result_cols)

    grouped = df.groupby(group_cols)["on_time"].agg(on_time_count="sum", total="count").reset_index()
    grouped["late_count"] = grouped["total"] - grouped["on_time_count"]
    return grouped[result_cols]


@bp.route("", methods=["GET", "POST"])
@roles_required(ROLE_ADMIN, ROLE_MANAGER)
def view_reports():
    form = ReportForm()

    if form.validate_on_submit():
        date_from = datetime.combine(form.date_from.data, time.min)
        date_to = datetime.combine(form.date_to.data, time.max)

        query = Task.query.filter(
            Task.is_done.is_(True),
            Task.completed_at >= date_from,
            Task.completed_at <= date_to,
        )
        if current_user.role == ROLE_MANAGER:
            query = query.filter(Task.department_id == current_user.department_id)

        rows = [
            {
                "department": task.department.name if task.department else "—",
                "employee": task.assignee.full_name if task.assignee else "—",
                "on_time": not task.is_late,
            }
            for task in query.all()
        ]
        df = pd.DataFrame(rows, columns=["department", "employee", "on_time"])

        by_department = _aggregate(df, ["department"]).rename(columns=COLUMN_LABELS)
        by_employee = _aggregate(df, ["department", "employee"]).rename(columns=COLUMN_LABELS)

        filename_base = f"otchet_{form.date_from.data.isoformat()}_{form.date_to.data.isoformat()}"
        buffer = io.BytesIO()

        if form.format.data == "csv":
            by_employee.to_csv(buffer, index=False, encoding="utf-8-sig")
            mimetype = "text/csv"
            filename = f"{filename_base}.csv"
        else:
            with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
                by_department.to_excel(writer, sheet_name="По подразделениям", index=False)
                by_employee.to_excel(writer, sheet_name="По сотрудникам", index=False)
            mimetype = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            filename = f"{filename_base}.xlsx"

        buffer.seek(0)
        return send_file(buffer, mimetype=mimetype, as_attachment=True, download_name=filename)

    return render_template("reports.html", form=form)
