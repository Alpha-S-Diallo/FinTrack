import sqlite3

con = sqlite3.connect('database.db')


cur = con.cursor()


def create_main_table():
   cur.execute(
    "CREATE TABLE IF NOT EXISTS TRANSACTION ("
    "ID INTEGER PRIMARY KEY AUTOINCREMENT, "
    "TRANSACTION_TYPE VARCHAR(20) NOT NULL, "
    "AMOUNT REAL NOT NULL, "
    "DATE TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, "
    "DESCRIPTION VARCHAR(255) NOT NULL, "
    "CATEGORY VARCHAR(20) NOT NULL"
    ")"
)
   

def select_all_transactions():
    cur.execute("SELECT * FROM TRANSACTION")
    return cur.fetchall()


def select_highest_transacition():
    cur.execute("SELECT * FROM TRANSACTION ORDER BY AMOUNT DESC")


def spending_by_catgory(category):
    cur.execute("SELECT * FROM TRANSACTION WHERE CATEGORY = ?", (category,))
    return cur.fetchall()


   


