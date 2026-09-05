# Dashboard API contract

Endpoints `Client/app.js` calls against the Flask app (`app.py`), running at
`http://localhost:5000`. All of these already exist and are wired up — this is
a reference for what the frontend expects, not a build list.

## `GET /AllTransactions`

Every row in `TRANSACTIONS`, as a JSON array of objects.

```json
[
  {
    "id": "abc123",
    "plaid_id": "abc123",
    "transaction_type": "place",
    "amount": 12.0,
    "date": "2026-08-09",
    "description": "McDonald's",
    "source": "acct_id_xyz",
    "category": "Food and Drink"
  }
]
```

Sign convention (Plaid's own): **positive `amount` = money out (spend)**,
**negative `amount` = money in (income/refund)**. The dashboard's KPIs, trend
chart, and category breakdown all key off this sign, not `transaction_type`.

## `GET /HighestTransaction`

Same shape as above, all rows, sorted by `amount` descending. The dashboard
only uses the compute-it-yourself max from `/AllTransactions` for the "Highest
transaction" tile today; this endpoint is kept for direct use elsewhere.

## `GET /SpendingByCategory/<category>`

Same row shape, filtered to one `category`. Not currently called by the
dashboard (category totals are computed client-side from `/AllTransactions`),
available if you want a server-filtered view later.

## `GET /Banks`

Connected banks, **without access tokens** (those never leave the server).

```json
[{ "id": 1, "bank_name": "Chase" }]
```

## `POST /create_link_token`

Body: none. Response:

```json
{ "link_token": "link-sandbox-..." }
```

Used to initialize Plaid Link on page load of the "Connect bank" flow.

## `POST /exchange_public_token`

Body:

```json
{ "public_token": "public-sandbox-...", "bank_name": "Chase" }
```

Exchanges Link's public token for a permanent access token, stores it via
`add_bank`, and returns:

```json
{ "item_id": "..." }
```

## `POST /Sync`

Body: none. Runs `sync_all_banks()` — pulls fresh transactions for every
connected bank right now, instead of waiting for the next full server
restart. The dashboard calls this immediately after a bank is connected.

## Adding to this later

Everything above is intentionally thin — no pagination, no auth, no
per-bank incremental cursor (each sync re-pages transactions from scratch).
Fine at personal scale; if this grows past a few accounts, the first thing
worth adding is a `LAST_CURSOR` column on `BANKS` so `/Sync` doesn't refetch
the same history every time.
