import logging
from flask import Flask, jsonify, request
from datetime import datetime, timezone

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)

task_queue = [
    {"id": 1, "from": "claude", "task": "Deploy new version", "timestamp": datetime.now(timezone.utc).isoformat()}
]

@app.route('/health', methods=['GET'])
def health_check():
    app.logger.info("Health check accessed")
    return jsonify({"status": "OK"}), 200

@app.route('/tasks', methods=['GET'])
def get_tasks():
    app.logger.info(f"GET /tasks request received. Returning {len(task_queue)} tasks.")
    return jsonify({"tasks": task_queue})

@app.route('/add_task', methods=['POST'])
def add_task():
    app.logger.info("POST /add_task request received")
    try:
        data = request.json
        if not data or "task" not in data:
            app.logger.error("Task data missing or malformed in request")
            return jsonify({"error": "Task data is missing or malformed"}), 400

        task = {
            "id": len(task_queue) + 1,
            "from": data.get("from", "unknown"),
            "task": data["task"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        task_queue.append(task)
        app.logger.info(f"Task added: {task}")
        return jsonify({"status": "Task added", "task": task}), 201
    except Exception as e:
        app.logger.error(f"Error processing /add_task: {e}", exc_info=True)
        return jsonify({"error": "An internal server error occurred"}), 500

if __name__ == '__main__':
    app.logger.info("Starting Flask application")
    app.run(host='0.0.0.0', port=5000)
