import time  
import json  
import requests  
import pprint
# Constants  
API_KEY = "DmPHbiL2E1X-Bai6ZUqWAJqrlMkyevBFp4UKkyb5Rw4"   
PUSH_ENDPOINT = "https://mango.sievedata.com/v2/push"  
JOBS_ENDPOINT_BASE = "https://mango.sievedata.com/v2/jobs/"  

# Headers including the API key for authentication  
HEADERS = {  
    "Content-Type": "application/json",  
    "X-API-Key": API_KEY  
}  

def push_download_job(youtube_url: str) -> str:  
    """
    Pushes a job to the Sieve YouTube-downloader API and returns the job ID.
    """  
    # Construct payload as per Sieve schema  
    payload = {  
        "function": "sieve/youtube-downloader",  
        "inputs": {  
            "url": youtube_url,  
            "download_type": "video",  
            "resolution": "360p",  
            "include_audio": True,  
            "start_time": 0,  
            "end_time": -1,  
            "include_metadata": False,  
            "metadata_fields": [],  
            "include_subtitles": False,  
            "subtitle_languages": [],  
            "video_format": "mp4",  
            "audio_format": "mp3",  
            "subtitle_format": "vtt"  
        }  
    }  

    # Send POST request to push the job  
    response = requests.post(PUSH_ENDPOINT, headers=HEADERS, json=payload)  
    if response.status_code != 200:  
        raise Exception(f"Failed to push job: {response.status_code} - {response.text}")  
    data = response.json()  # Parse JSON response  
    job_id = data.get("id")  
    print(f"Pushed job. ID: {job_id}")  
    return job_id  

def poll_job_status(job_id: str, interval: int = 5) -> dict:  
    """
    Polls the Sieve job status until the job is finished, then returns the final job JSON.
    """  
    status_url = f"{JOBS_ENDPOINT_BASE}{job_id}"  
    while True:  
        resp = requests.get(status_url, headers={"X-API-Key": API_KEY})  
        if resp.status_code != 200:  
            raise Exception(f"Error polling job: {resp.status_code} - {resp.text}")  
        job_info = resp.json()  # Get job info  
        current_status = job_info.get("status")  
        print(f"Job {job_id} status: {current_status}")  
        if current_status == "finished":  
            return job_info  
        elif current_status in ["failed", "error"]:  
            raise Exception(f"Job {job_id} did not complete successfully: {job_info}")  
        time.sleep(interval)  

def download_video_file(file_url: str, output_path: str):  
    """
    Downloads the video file from the given URL and saves it to disk in chunks.
    """  
    with requests.get(file_url, stream=True) as r:  
        r.raise_for_status()  
        with open(output_path, "wb") as f:  
            for chunk in r.iter_content(chunk_size=8192):  
                if chunk:  # Filter out keep-alive chunks  
                    f.write(chunk)  
    print(f"Video saved to {output_path}")  

def main():  
    # Hardcoded YouTube URL (modify as needed)  
    youtube_url = "https://www.youtube.com/watch?v=1aA1WGON49E"  

    # Step 1: Push the download job  
    job_id = push_download_job(youtube_url)  

    # Step 2: Poll for job completion  
    job_info = poll_job_status(job_id)  
    # Step 3: Extract output file URL  
    outputs = job_info.get("outputs", [])  
    if not outputs:  
        raise Exception("No outputs found in job info.")  
    # Assuming the first output is the video file; adjust as needed  
    video_url = outputs[0]["data"]["url"]  
    if not video_url:  
        raise Exception("No video URL found in outputs.")  

    # Step 4: Download the video file locally  
    download_video_file(video_url, "downloaded_video.mp4")  

if __name__ == "__main__":  
    main()  
