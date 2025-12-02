import sqlite3
import os
import asyncio

class DBManager:
    def __init__(self, target_name: str = "default", target_hash: str = "000"):
        os.makedirs("database", exist_ok=True)
        self.db_path = f"database/{target_name}_{target_hash}.db"
        self.conn = None

    async def init_db(self):
        """Initialize database tables asynchronously (running sync in executor)"""
        await asyncio.to_thread(self._init_db_sync)

    def _init_db_sync(self):
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        cursor = self.conn.cursor()
        
        # Comments table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS comments (
                address TEXT PRIMARY KEY,
                comment TEXT
            )
        ''')

        # Patches table: stores original bytes to allow revert
        # address is hex string "0x..."
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS patches (
                address TEXT PRIMARY KEY,
                orig_bytes TEXT, -- hex string "9090"
                new_bytes TEXT,  -- hex string "EBFE"
                enabled INTEGER DEFAULT 1
            )
        ''')

        self.conn.commit()

    async def save_comment(self, address: str, comment: str):
        await asyncio.to_thread(self._execute, 
            "INSERT OR REPLACE INTO comments (address, comment) VALUES (?, ?)", 
            (address, comment))

    async def get_comments(self):
        rows = await asyncio.to_thread(self._query, "SELECT address, comment FROM comments")
        return {row[0]: row[1] for row in rows}

    async def save_patch(self, address: str, orig_bytes: list, new_bytes: list):
        # Convert lists [0x90, 0x90] to hex strings "9090"
        orig_str = "".join([f"{b:02x}" for b in orig_bytes])
        new_str = "".join([f"{b:02x}" for b in new_bytes])
        
        await asyncio.to_thread(self._execute,
            "INSERT OR REPLACE INTO patches (address, orig_bytes, new_bytes) VALUES (?, ?, ?)",
            (address, orig_str, new_str))

    async def get_patch(self, address: str):
        rows = await asyncio.to_thread(self._query, "SELECT orig_bytes, new_bytes FROM patches WHERE address = ?", (address,))
        if rows:
            return {'orig_bytes': rows[0][0], 'new_bytes': rows[0][1]}
        return None

    async def get_patches(self):
        """Returns list of patches for frontend state"""
        rows = await asyncio.to_thread(self._query, "SELECT address, new_bytes FROM patches")
        # Return list of addresses that are patched
        return [row[0] for row in rows]

    async def delete_patch(self, address: str):
        await asyncio.to_thread(self._execute, "DELETE FROM patches WHERE address = ?", (address,))

    def _execute(self, sql, params):
        cursor = self.conn.cursor()
        cursor.execute(sql, params)
        self.conn.commit()

    def _query(self, sql, params=()):
        cursor = self.conn.cursor()
        cursor.execute(sql, params)
        return cursor.fetchall()

    def close(self):
        if self.conn:
            self.conn.close()
