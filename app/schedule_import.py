import calendar
import re
from datetime import datetime

import pandas as pd

from app.models import Department

TITLE_COL = 1
DEPT_EXEC_COL = 2
DEADLINE_COL = 3

DAY_RE = re.compile(r"(\d{1,2})\s*(?:-?х\s*)?числ", re.IGNORECASE)

# (подстрока в тексте "подразделение-исполнитель", подстрока в названии подразделения в системе)
DEPARTMENT_KEYWORDS = [
    ("ккк", "крупных"),
    ("стпкр", "b2b"),
    ("цтпк", "центр"),
]


def _clean_text(value):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def _find_header_row(df):
    for i in range(min(20, len(df))):
        if _clean_text(df.iloc[i, TITLE_COL]) == "Мероприятия":
            return i
    return None


def _match_department(raw_dept_text, departments):
    text = raw_dept_text.lower()
    for abbr, name_keyword in DEPARTMENT_KEYWORDS:
        if abbr in text:
            for dept in departments:
                if name_keyword in dept.name.lower():
                    return dept.id

    for dept in departments:
        if "центр" in dept.name.lower():
            return dept.id

    return departments[0].id if departments else None


def _parse_deadline(raw_deadline_text, year, month):
    match = DAY_RE.search(raw_deadline_text)
    if match:
        day = int(match.group(1))
        target_year, target_month = year, month
        if "следующ" in raw_deadline_text.lower():
            target_month += 1
            if target_month > 12:
                target_month = 1
                target_year += 1
        last_day = calendar.monthrange(target_year, target_month)[1]
        day = min(day, last_day)
        return datetime(target_year, target_month, day, 18, 0)

    last_day = calendar.monthrange(year, month)[1]
    return datetime(year, month, last_day, 18, 0)


def parse_schedule_file(file_stream, year, month):
    """Разбирает Excel-файл сетевого графика.

    Возвращает (created, skipped):
    - created: список словарей title/department_id/raw_dept_text/raw_deadline_text/deadline
    - skipped: список названий строк-заголовков разделов, которые не стали задачами
    """
    df = pd.read_excel(file_stream, header=None, sheet_name=0)
    header_row = _find_header_row(df)
    if header_row is None:
        raise ValueError("Не удалось найти строку заголовка «Мероприятия» в файле")

    departments = Department.query.order_by(Department.id).all()

    created = []
    skipped = []

    for i in range(header_row + 1, len(df)):
        title = _clean_text(df.iloc[i, TITLE_COL])
        dept_text = _clean_text(df.iloc[i, DEPT_EXEC_COL])
        deadline_text = _clean_text(df.iloc[i, DEADLINE_COL])

        if not title:
            continue
        if not dept_text and not deadline_text:
            skipped.append(title)
            continue

        created.append({
            "title": title,
            "department_id": _match_department(dept_text, departments),
            "raw_dept_text": dept_text,
            "raw_deadline_text": deadline_text,
            "deadline": _parse_deadline(deadline_text, year, month),
        })

    return created, skipped
