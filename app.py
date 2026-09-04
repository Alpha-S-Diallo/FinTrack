import flask
from database.db import create_main_table, select_all_transactions, select_highest_transacition, spending_by_catgory
from plaid_client.fetch import add_to_db, print_values, remove, modify_in_db
from plaid_client.fetch import sync
import os


app = flask.Flask(__name__)


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









if __name__ == "__main__":
    create_main_table()
    add_to_db()
    remove()
    modify_in_db()
    app.run(debug=True)