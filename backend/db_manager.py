

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

        # Patches table: GRANULAR BYTE STORAGE
        # address is HEX STRING (e.g. "0x401000")
        # orig_byte and new_byte are INTEGERS (0-255)
        
        # Check if old table exists and drop it if it has old schema (simple check)
        # For simplicity in this dev environment, we'll try to create the new one.
        # If schema mismatch error occurs, we might need manual reset.
        # But here we define the desired schema.
        
        try:
            cursor.execute('SELECT orig_bytes FROM patches LIMIT 1')
            # If this succeeds, we have the old schema. We should drop it.
            cursor.execute('DROP TABLE patches')
        except sqlite3.OperationalError:
            pass # Table doesn't exist or is already new schema (or empty)

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS patches (
                address TEXT PRIMARY KEY,
                orig_byte INTEGER, 
                new_byte INTEGER,
                enabled INTEGER DEFAULT 1
            )
        ''')

        self.conn.commit()

    async def reset_db(self):
        """Closes connection, deletes file, re-initializes"""
        if self.conn:
            self.conn.close()
            self.conn = None
        
        if os.path.exists(self.db_path):
            await asyncio.to_thread(os.remove, self.db_path)
        
        await self.init_db()

    async def save_comment(self, address: str, comment: str):
        await asyncio.to_thread(self._execute, 
            "INSERT OR REPLACE INTO comments (address, comment) VALUES (?, ?)", 
            (address, comment))

    async def get_comments(self):
        rows = await asyncio.to_thread(self._query, "SELECT address, comment FROM comments")
        return {row[0]: row[1] for row in rows}

    async def save_patch_byte(self, address: str, orig_byte: int, new_byte: int):
        """Saves a single byte patch."""
        await asyncio.to_thread(self._execute,
            "INSERT OR REPLACE INTO patches (address, orig_byte, new_byte) VALUES (?, ?, ?)",
            (address, orig_byte, new_byte))

    async def get_patch_byte(self, address: str):
        """Returns {orig_byte, new_byte} or None"""
        rows = await asyncio.to_thread(self._query, "SELECT orig_byte, new_byte FROM patches WHERE address = ?", (address,))
        if rows:
            return {'orig_byte': rows[0][0], 'new_byte': rows[0][1]}
        return None

    async def get_patches(self):
        """Returns list of modified addresses for frontend state"""
        rows = await asyncio.to_thread(self._query, "SELECT address FROM patches")
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
