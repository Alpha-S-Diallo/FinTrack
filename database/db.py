import sqlite3

con = sqlite3.connect('database.db')
cur = con.cursor()


def create_main_table():
   cur.execute(
    "CREATE TABLE IF NOT EXISTS TRANSACTIONS ("
    "ID TEXT PRIMARY KEY, "
    "PLAID_ID TEXT, "                  # Plaid's transaction_id (used for dedup)
    "TRANSACTION_TYPE VARCHAR(20) NOT NULL, "  # expense / transfer / income
    "AMOUNT REAL NOT NULL, "            # dollar amount
    "DATE TEXT NOT NULL, "             # actual transaction date from Plaid
    "DESCRIPTION VARCHAR(255) NOT NULL, "  # merchant / description
    "SOURCE VARCHAR(20), "             # which account: amex / checking / savings
    "CATEGORY VARCHAR(20) NOT NULL"    # spending category
    ")"
)
   con.commit()


def select_all_transactions():
    cur.execute("SELECT * FROM TRANSACTIONS")
    return cur.fetchall()


def select_highest_transacition():
    cur.execute("SELECT * FROM TRANSACTIONS ORDER BY AMOUNT DESC")
    return cur.fetchall()


def spending_by_catgory(category):
    cur.execute("SELECT * FROM TRANSACTIONS WHERE CATEGORY = ?", (category,))
    return cur.fetchall()