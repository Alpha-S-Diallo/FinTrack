import flask
from flask_cors import CORS
from database.db import create_main_table, create_bank_table, select_all_transactions, select_highest_transacition, spending_by_catgory, add_bank, select_banks
from plaid_client.fetch import print_values, sync_all_banks
from plaid_client.connect_plaid import create_access_token, create_link_token, exchange_public_token
import os


app = flask.Flask(__name__)
CORS(app)


@app.route('/AllTransactions', methods=['GET'])
def get_all_transactions():
    transactions = select_all_transactions()
    return flask.jsonify(transactions)



@app.route('/HighestTransaction', methods=['GET'])
def get_highest_transaction():
    transactions = select_highest_transacition()
    return flask.jsonify(transactions)


@app.route('/SpendingByCategory/<category>', methods=['GET'])
def get_spending_by_category(category):
    transactions = spending_by_catgory(category)
    return flask.jsonify(transactions)


@app.route('/AddBank', methods=['POST'])
def add_bank_route():
    data = flask.request.get_json()
    bank_name = data.get("bank_name")
    institution_id = data.get("institution_id")

    access_token, item_id = create_access_token(institution_id)
    add_bank(bank_name, access_token)

    return flask.jsonify({"bank_name": bank_name, "item_id": item_id})


@app.route('/create_link_token', methods=['POST'])
def create_link_token_route():
    link_token = create_link_token()
    return flask.jsonify({"link_token": link_token})


@app.route('/exchange_public_token', methods=['POST'])
def exchange_public_token_route():
    data = flask.request.get_json()
    public_token = data.get("public_token")
    bank_name = data.get("bank_name", "Bank")

    access_token, item_id = exchange_public_token(public_token)
    add_bank(bank_name, access_token)

    return flask.jsonify({"item_id": item_id})


@app.route('/Banks', methods=['GET'])
def get_banks():
    return flask.jsonify(select_banks())


@app.route('/Sync', methods=['POST'])
def sync_route():
    sync_all_banks()
    return flask.jsonify({"status": "ok"})









if __name__ == "__main__":
    create_main_table()
    create_bank_table()
    sync_all_banks()
    app.run(debug=True)