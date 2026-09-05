import os
from dotenv import load_dotenv
import plaid
from plaid.api import plaid_api
from plaid.model.sandbox_public_token_create_request import SandboxPublicTokenCreateRequest
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.country_code import CountryCode
from plaid.model.products import Products

load_dotenv()

CLIENT_ID = os.getenv("PLAID_CLIENT_ID")
SECRET = os.getenv("PRODUCTION_SECRET_PLAID")
Sandbox_Secret = os.getenv("SANDBOX_PLAID")
Host = "https://production.plaid.com"

print("client id:", CLIENT_ID)
print("Secret:", SECRET)
print("sandbox secret:", Sandbox_Secret)


configuration = plaid.Configuration(
    host=Host,
    api_key={
        "clientId": CLIENT_ID,
        "secret": SECRET
    }
)
api_client = plaid.ApiClient(configuration)
client = plaid_api.PlaidApi(api_client)


def create_access_token(institution_id="ins_109508", products=None):
    products = products or ["transactions"]

    # step 1: create the sandbox public token (fakes a bank login)
    public_token_request = SandboxPublicTokenCreateRequest(
        institution_id=institution_id,
        initial_products=[Products(p) for p in products]
    )
    public_token_respone = client.sandbox_public_token_create(public_token_request)

    # step 2: exchange the public token for the durable access token
    access_token_request = ItemPublicTokenExchangeRequest(
        public_token=public_token_respone['public_token']
    )
    access_token_respone = client.item_public_token_exchange(access_token_request)

    # pull out what we need
    access_token = access_token_respone['access_token']
    item_id = access_token_respone['item_id']

    return access_token, item_id


def create_link_token(user_id="fintrack-user", products=None):
    products = products or ["transactions"]

    request = LinkTokenCreateRequest(
        client_name="FinTrack",
        language="en",
        country_codes=[CountryCode('US')],
        user=LinkTokenCreateRequestUser(client_user_id=user_id),
        products=[Products(p) for p in products],
    )
    response = client.link_token_create(request)

    return response['link_token']


def exchange_public_token(public_token):
    request = ItemPublicTokenExchangeRequest(public_token=public_token)
    response = client.item_public_token_exchange(request)

    access_token = response['access_token']
    item_id = response['item_id']

    return access_token, item_id