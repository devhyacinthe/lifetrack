from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from apps.core.pagination import StandardPagination

factory = APIRequestFactory()


def paginate(query):
    paginator = StandardPagination()
    request = Request(factory.get("/items/", query))
    page = paginator.paginate_queryset(list(range(250)), request)
    return paginator, page


def test_default_page_size_is_20():
    _, page = paginate({})

    assert len(page) == 20


def test_page_size_can_be_requested():
    _, page = paginate({"page_size": 50})

    assert len(page) == 50


def test_page_size_is_capped_at_100():
    _, page = paginate({"page_size": 1000})

    assert len(page) == 100


def test_response_contains_count_and_links():
    paginator, page = paginate({"page": 2})
    data = paginator.get_paginated_response(page).data

    assert data["count"] == 250
    assert data["next"] is not None
    assert data["previous"] is not None
    assert data["results"][0] == 20
