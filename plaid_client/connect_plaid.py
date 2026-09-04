import os
from dotenv import load_dotenv
import plaid
from plaid.api import plaid_api
from plaid.model.sandbox_public_token_create_request import SandboxPublicTokenCreateRequest
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.products import Products

load_dotenv()

CLIENT_ID = os.getenv("PLAID_CLIENT_ID")
SECRET = os.getenv("PRODUCTION_SECRET_PLAID")
Sandbox_Secret = os.getenv("SANDBOX_PLAID")

print("client id:", CLIENT_ID)
print("Secret:", SECRET)
print("sandbox secret:", Sandbox_Secret)

configuration = plaid.Configuration(
    host=plaid.Environment.Sandbox,
    api_key={
        "clientId": CLIENT_ID,
        "secret": Sandbox_Secret
    }
)

api_client = plaid.ApiClient(configuration)
client = plaid_api.PlaidApi(api_client)
# step 1: create the sandbox public token (fakes a bank login)
public_token_request = SandboxPublicTokenCreateRequest(
    institution_id="ins_109508",
    initial_products=[Products('transactions')]
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

print("Access token:", access_token)
print("Item ID:", item_id)