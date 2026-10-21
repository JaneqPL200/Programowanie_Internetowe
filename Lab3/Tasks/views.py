import json

from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods

from .models import Task


@ensure_csrf_cookie
def index(request):
    return render(request, "Tasks/index.html")


def error_response(message, status=400):
    return JsonResponse(
        {"error": message},
        status=status
    )


def parse_json(request):
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None, error_response("Nieprawidłowy format JSON.")

    if not isinstance(data, dict):
        return None, error_response(
            "Dane muszą być obiektem JSON."
        )

    return data, None


def task_to_dict(task):
    return {
        "id": task.id,
        "title": task.title,
        "completed": task.completed,
        "created_at": task.created_at.isoformat(),
    }


@require_http_methods(["GET", "POST"])
def tasks_api(request):
    if request.method == "GET":
        tasks = Task.objects.all()

        return JsonResponse(
            [task_to_dict(task) for task in tasks],
            safe=False
        )

    data, error = parse_json(request)

    if error:
        return error

    title = data.get("title")

    if not isinstance(title, str) or not title.strip():
        return error_response(
            "Treść zadania nie może być pusta."
        )

    title = title.strip()

    if len(title) > 200:
        return error_response(
            "Treść zadania może mieć maksymalnie 200 znaków."
        )

    task = Task.objects.create(title=title)

    return JsonResponse(
        task_to_dict(task),
        status=201
    )


@require_http_methods(["PATCH", "DELETE"])
def task_detail_api(request, task_id):
    try:
        task = Task.objects.get(pk=task_id)
    except Task.DoesNotExist:
        return error_response(
            "Nie znaleziono zadania o podanym ID.",
            status=404
        )

    if request.method == "PATCH":
        data, error = parse_json(request)

        if error:
            return error

        completed = data.get("completed")

        if not isinstance(completed, bool):
            return error_response(
                "Pole completed musi mieć wartość true lub false."
            )

        task.completed = completed
        task.save(update_fields=["completed"])

        return JsonResponse(task_to_dict(task))

    task.delete()

    return JsonResponse(
        {
            "message": "Zadanie zostało usunięte.",
            "id": task_id
        }
    )