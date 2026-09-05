import sqlite3

DB_PATH = 'database.db'


def _connect():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def _rows_to_dicts(rows):
    return [{k.lower(): row[k] for k in row.keys()} for row in rows]


def create_main_table():
    con = _connect()
    con.execute(
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
    con.close()


def create_bank_table():
    con = _connect()
    con.execute(
        "CREATE TABLE IF NOT EXISTS BANKS ("
        "ID INTEGER PRIMARY KEY AUTOINCREMENT, "
        "BANK_NAME VARCHAR(255) NOT NULL, "
        "ACCESS_TOKEN VARCHAR(255) NOT NULL"
        ")"
    )
    con.commit()
    con.close()


def add_bank(bank_name, access_token):
    con = _connect()
    con.execute("INSERT INTO BANKS (BANK_NAME, ACCESS_TOKEN) VALUES (?, ?)", (bank_name, access_token))
    con.commit()
    con.close()


def select_all_banks():
    con = _connect()
    rows = con.execute("SELECT BANK_NAME, ACCESS_TOKEN FROM BANKS").fetchall()
    con.close()
    return rows


def select_banks():
    con = _connect()
    rows = con.execute("SELECT ID, BANK_NAME FROM BANKS").fetchall()
    con.close()
    return _rows_to_dicts(rows)


def select_all_transactions():
    con = _connect()
    rows = con.execute("SELECT * FROM TRANSACTIONS").fetchall()
    con.close()
    return _rows_to_dicts(rows)


def select_highest_transacition():
    con = _connect()
    rows = con.execute("SELECT * FROM TRANSACTIONS ORDER BY AMOUNT DESC").fetchall()
    con.close()
    return _rows_to_dicts(rows)


def spending_by_catgory(category):
    con = _connect()
    rows = con.execute("SELECT * FROM TRANSACTIONS WHERE CATEGORY = ?", (category,)).fetchall()
    con.close()
    return _rows_to_dicts(rows)
