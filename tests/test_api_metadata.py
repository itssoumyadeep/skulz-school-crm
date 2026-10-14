import pytest
from django.apps import apps
from django.test import Client


@pytest.mark.django_db
def test_admin_data_classification_covers_all_core_models(
    tenant_a, admin_token_tenant_a, parent_token_tenant_a
):
    client = Client()
    response = client.get(
        "/api/v1/metadata/data-classification",
        HTTP_AUTHORIZATION=f"Bearer {admin_token_tenant_a}",
    )

    assert response.status_code == 200
    catalog = response.json()["data"]
    elements = catalog["elements"]
    expected_models = {
        model.__name__
        for model in apps.get_app_config("core").get_models()
        if not model._meta.abstract
    }
    assert {element["name"] for element in elements} == expected_models
    assert {element["category"] for element in elements} == {
        "Actors",
        "Processes",
        "Meta Data",
    }
    assert sum(category["count"] for category in catalog["categories"]) == len(
        expected_models
    )

    student = next(element for element in elements if element["name"] == "Student")
    assert student["category"] == "Actors"
    assert "student_number" in {field["name"] for field in student["fields"]}

    parent_response = client.get(
        "/api/v1/metadata/data-classification",
        HTTP_AUTHORIZATION=f"Bearer {parent_token_tenant_a}",
    )
    assert parent_response.status_code == 403