import json
import os
import psycopg2
from datetime import datetime

def get_db_connection():
    """Получить соединение с базой данных"""
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: dict, context) -> dict:
    """API для управления данными стрельбы: сохранение сессий, стрелков и выстрелов"""
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    query_params = event.get('queryStringParameters', {}) or {}
    action = query_params.get('action', '')
    
    try:
        if method == 'POST' and action == 'create-session':
            return create_session(event)
        elif method == 'POST' and action == 'create-shooter':
            return create_shooter(event)
        elif method == 'POST' and action == 'create-shot':
            return create_shot(event)
        elif method == 'GET' and action == 'get-sessions':
            return get_sessions()
        elif method == 'GET' and action == 'get-session-details':
            return get_session_details(event)
        elif method == 'PUT' and action == 'complete-session':
            return complete_session(event)
        else:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Endpoint not found', 'action': action}),
                'isBase64Encoded': False
            }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }

def create_session(event: dict) -> dict:
    """Создать новую сессию стрельбы"""
    data = json.loads(event.get('body', '{}'))
    name = data.get('name', f"Сессия {datetime.now().strftime('%d.%m.%Y %H:%M')}")
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute(
        "INSERT INTO sessions (name, created_at) VALUES (%s, %s) RETURNING id",
        (name, datetime.now())
    )
    session_id = cur.fetchone()[0]
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'session_id': session_id, 'name': name}),
        'isBase64Encoded': False
    }

def create_shooter(event: dict) -> dict:
    """Создать или получить стрелка"""
    data = json.loads(event.get('body', '{}'))
    name = data.get('name', '')
    
    if not name:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Name is required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT id FROM shooters WHERE name = %s", (name,))
    row = cur.fetchone()
    
    if row:
        shooter_id = row[0]
    else:
        cur.execute(
            "INSERT INTO shooters (name, created_at) VALUES (%s, %s) RETURNING id",
            (name, datetime.now())
        )
        shooter_id = cur.fetchone()[0]
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'shooter_id': shooter_id, 'name': name}),
        'isBase64Encoded': False
    }

def create_shot(event: dict) -> dict:
    """Сохранить результат выстрела"""
    data = json.loads(event.get('body', '{}'))
    shooter_id = data.get('shooter_id')
    session_id = data.get('session_id')
    score = data.get('score')
    
    if not all([shooter_id, session_id, score is not None]):
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'shooter_id, session_id and score are required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute(
        "INSERT INTO shots (shooter_id, session_id, score, created_at) VALUES (%s, %s, %s, %s) RETURNING id",
        (shooter_id, session_id, score, datetime.now())
    )
    shot_id = cur.fetchone()[0]
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'shot_id': shot_id}),
        'isBase64Encoded': False
    }

def get_sessions() -> dict:
    """Получить список всех сессий"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT 
            s.id, 
            s.name, 
            s.created_at, 
            s.completed_at,
            COUNT(DISTINCT sh.shooter_id) as shooter_count,
            COUNT(sh.id) as shot_count,
            COALESCE(SUM(sh.score), 0) as total_score
        FROM sessions s
        LEFT JOIN shots sh ON s.id = sh.session_id
        GROUP BY s.id, s.name, s.created_at, s.completed_at
        ORDER BY s.created_at DESC
    """)
    
    sessions = []
    for row in cur.fetchall():
        sessions.append({
            'id': row[0],
            'name': row[1],
            'created_at': row[2].isoformat() if row[2] else None,
            'completed_at': row[3].isoformat() if row[3] else None,
            'shooter_count': row[4],
            'shot_count': row[5],
            'total_score': row[6]
        })
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'sessions': sessions}),
        'isBase64Encoded': False
    }

def get_session_details(event: dict) -> dict:
    """Получить детали конкретной сессии"""
    params = event.get('queryStringParameters', {})
    session_id = params.get('session_id')
    
    if not session_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'session_id is required'})
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT 
            s.id,
            s.name,
            s.created_at,
            s.completed_at
        FROM sessions s
        WHERE s.id = %s
    """, (session_id,))
    
    session_row = cur.fetchone()
    if not session_row:
        cur.close()
        conn.close()
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Session not found'}),
            'isBase64Encoded': False
        }
    
    cur.execute("""
        SELECT 
            sh.id,
            sh.name,
            COUNT(st.id) as shot_count,
            COALESCE(SUM(st.score), 0) as total_score
        FROM shooters sh
        INNER JOIN shots st ON sh.id = st.shooter_id
        WHERE st.session_id = %s
        GROUP BY sh.id, sh.name
        ORDER BY total_score DESC
    """, (session_id,))
    
    shooters = []
    for row in cur.fetchall():
        shooter_id = row[0]
        
        cur.execute("""
            SELECT score, created_at
            FROM shots
            WHERE shooter_id = %s AND session_id = %s
            ORDER BY created_at ASC
        """, (shooter_id, session_id))
        
        shots = [{'score': s[0], 'timestamp': s[1].isoformat()} for s in cur.fetchall()]
        
        shooters.append({
            'id': shooter_id,
            'name': row[1],
            'shot_count': row[2],
            'total_score': row[3],
            'shots': shots
        })
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'session': {
                'id': session_row[0],
                'name': session_row[1],
                'created_at': session_row[2].isoformat() if session_row[2] else None,
                'completed_at': session_row[3].isoformat() if session_row[3] else None
            },
            'shooters': shooters
        }),
        'isBase64Encoded': False
    }

def complete_session(event: dict) -> dict:
    """Завершить сессию"""
    data = json.loads(event.get('body', '{}'))
    session_id = data.get('session_id')
    
    if not session_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'session_id is required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute(
        "UPDATE sessions SET completed_at = %s WHERE id = %s",
        (datetime.now(), session_id)
    )
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': True}),
        'isBase64Encoded': False
    }