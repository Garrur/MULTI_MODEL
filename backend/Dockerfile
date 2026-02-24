# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set environment variables for Python
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Hugging Face Spaces uses port 7860 by default
ENV PORT=7860

# Install system dependencies required for OpenCV and AI models
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install Python dependencies
# We specifically install the CPU-only version of PyTorch to save space and avoid GPU driver issues on the free tier
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

# Copy the current directory contents into the container at /app
COPY . .

# Create directories for static files and databases
RUN mkdir -p static/thumbnails static/anomalies database/data
RUN chmod -R 777 static database

# Expose the port Hugging Face expects
EXPOSE 7860

# Command to run the FastAPI server
CMD uvicorn app:app --host 0.0.0.0 --port $PORT
