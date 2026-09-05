from dotenv import load_dotenv

from plaid.model.transactions_sync_request import TransactionsSyncRequest
from plaid_client.connect_plaid import client
from database import db
import sqlite3


load_dotenv()


def categorize_transaction(transaction):
    # Example categorization logic based on transaction name
    name = transaction['name'].lower()
    if 'starbucks' in name or 'coffee' in name:
        return 'Food and Drink'
    elif 'uber' in name or 'lyft' in name:
        return 'Transportation'
    elif 'netflix' in name or 'hulu' in name:
        return 'Entertainment'
    else:
        return 'Other'



def sync(access_token):
    cursor = ""

    added = []
    modified = []
    removed = []
    has_more = True

    while has_more:
        request = TransactionsSyncRequest(
            access_token=access_token,
            cursor=cursor,
        )

        response = client.transactions_sync(request)

        added.extend(response['added'])
        modified.extend(response['modified'])
        removed.extend(response['removed'])

        has_more = response['has_more']
        cursor = response['next_cursor']

    print("Added:", len(added))
    print("Modified:", len(modified))
    print("Removed:", len(removed))

    return added, modified, removed




def print_values():
    pass


def add_to_db(access_token):
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    added, modified, removed = sync(access_token)

    ## added is a list of transaction objects
    """" Added is a list of transactiosn objceects so like [tracnaction1, transcationc2 ] adn each trancations is
    [traacton1{trancaction:_id: "123", transaction_type: "expense", amount: 10.00, date: "2023-01-01", name: "Starbucks", account_id: "checking", category: ["Food and Drink"]},]"""

    cursor.executemany(
        "INSERT OR IGNORE INTO TRANSACTIONS(PLAID_ID, TRANSACTION_TYPE, AMOUNT, DATE, DESCRIPTION, SOURCE, CATEGORY, ID) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
            (
                transaction['transaction_id'],
                transaction['transaction_type'],
                transaction['amount'],
                transaction['date'],
                transaction['name'],
                transaction['account_id'],
                transaction['category'][0] if transaction['category'] else None,
                transaction['transaction_id'],
            )
            for transaction in added
        ],
    )

    conn.commit()
    conn.close()

def modify_in_db(access_token):
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    added, modified, removed = sync(access_token)

    cursor.executemany(
        "UPDATE TRANSACTIONS SET TRANSACTION_TYPE=?, AMOUNT=?, DATE=?, DESCRIPTION=?, SOURCE=?, CATEGORY=? WHERE PLAID_ID=?",
        [
            (
                transaction['transaction_type'],
                transaction['amount'],
                transaction['date'],
                transaction['name'],
                transaction['account_id'],
                transaction['category'][0] if transaction['category'] else None,
                transaction['transaction_id'],
            )
            for transaction in modified
        ],
    )

    conn.commit()
    conn.close()


def remove(access_token):
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    added, modified, removed = sync(access_token)

    cursor.executemany(
        "DELETE FROM TRANSACTIONS WHERE PLAID_ID=?",
        [(transaction['transaction_id'],) for transaction in removed],
    )

    conn.commit()
    conn.close()


def sync_all_banks():
    for bank_name, access_token in db.select_all_banks():
        add_to_db(access_token)
        modify_in_db(access_token)
        remove(access_token)

        

    
