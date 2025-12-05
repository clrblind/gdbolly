from db_manager import DBManager

# Global Managers
db_manager: DBManager = None
last_opened_path = "/targets/hello"

def get_db_manager():
    return db_manager

def set_db_manager(manager):
    global db_manager
    db_manager = manager

def get_last_opened_path():
    return last_opened_path

def set_last_opened_path(path):
    global last_opened_path
    last_opened_path = path
