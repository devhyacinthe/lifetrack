from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """Pagination par numéro de page : 20 éléments par défaut, 100 au maximum."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
