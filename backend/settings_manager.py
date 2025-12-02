
import sqlite3
import os
import asyncio

class SettingsManager:
    def __init__(self):
        os.makedirs("database", exist_ok=True)
        self.db_path = "database/app_settings.db"
        self.conn = None

    async def init_db(self):
        await asyncio.to_thread(self._init_db_sync)

    def _init_db_sync(self):
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        cursor = self.conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        ''')
        self.conn.commit()

    async def get_all_settings(self):
        if not self.conn: await self.init_db()
        rows = await asyncio.to_thread(self._query, "SELECT key, value FROM settings")
        return {row[0]: row[1] for row in rows}

    async def save_setting(self, key: str, value: str):
        if not self.conn: await self.init_db()
        # Convert all values to string for storage
        await asyncio.to_thread(self._execute, 
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", 
            (key, str(value)))

    def _execute(self, sql, params):
        cursor = self.conn.cursor()
        cursor.execute(sql, params)
        self.conn.commit()

    def _query(self, sql, params=()):
        cursor = self.conn.cursor()
        cursor.execute(sql, params)
        return cursor.fetchall()
