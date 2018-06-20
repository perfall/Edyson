# -*- coding: utf-8 -*-
import os

from flask import Flask, render_template, request, flash, redirect, url_for
from werkzeug.utils import secure_filename
import subprocess
import sys
sys.path.append("../python")
sys.path.append("..")
import audio2spec
import spec2map
import time

UPLOAD_FOLDER = 'uploads/'
ALLOWED_EXTENSIONS = set(['wav'])

app = Flask(__name__)
app.secret_key = 'hejhej00'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def upload_file():
    #subprocess.call('rm /uploads/*', shell=True)
    return render_template('index.html')

@app.route('/visualizer', methods=['POST'])
def visualizer() -> str:
    if request.method == 'POST':
        if 'file' not in request.files:
            flash('No file part')
            return "<h3>No submitted file. Please go back and choose an audio file.</h3>"
        else:
            file = request.files['file']
            if file.filename == '':
                flash('No selected file')
                return "<h3>Something went wrong, possibly relating to the name of the file.</h3>"
            if file and allowed_file(file.filename):
                session_id = str(time.time()).split(".")[0] + str(time.time()).split(".")[1]
                filename = secure_filename(file.filename)
                subprocess.call('mkdir uploads/' + session_id, shell=True)
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], session_id + "/" + filename))
                print(file.filename + " saved")
            else:
                print("File extension not allowed")
                return "<h3>File extension not allowed. Please use WAV.</h3>"
    
    algorithm = request.form['radio1']
    dimensionality = request.form['radio2']
    segment_size = request.form['radio3']
    features = request.form['radio4']
    print(algorithm)
    print(dimensionality)
    print(segment_size)
    print(features)
    #subprocess.call('python ../python/audio2spec.py uploads static/data/test', shell=True)
    audio2spec.main(str(1000), str(65), segment_size, "uploads/" + session_id, "static/data/" + session_id, manual_segment=False)
    cluster = spec2map.Cluster()
    spec_path, sound_path = "static/data/" + session_id + "/spectrograms/", "static/data/" + session_id + "/sounds/"
    cluster.train_tsne(spec_path, sound_path, 100)
    # subprocess.call('python ../python/spec2map.py tsne ../data/test', shell=True)
    return render_template('visualizer.html', path="static/data/" + session_id)


if __name__ == '__main__':
    #app.run(debug=True)
    app.run(host='0.0.0.0', debug=True, port=3134)

