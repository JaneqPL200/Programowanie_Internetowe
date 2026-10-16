from django.shortcuts import render

def index(request):
    return render(request, "frontend_demo/index.html")
