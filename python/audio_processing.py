import time
import subprocess
import random
import sys
sys.path.append("../python")
from HTK import HTKFile
import numpy as np
import os
import wave
import contextlib
#from sklearn.manifold import TSNE
from sklearn.decomposition import PCA
from MulticoreTSNE import MulticoreTSNE as TSNE
from pydub import AudioSegment
import csv

smilextract = '../opensmile-2.3.0/SMILExtract'

def update_config(config_file, segment_size, step_size):
    print(config_file)
    with open(config_file, "r", encoding='windows-1252') as f:
        lines = f.readlines()
    with open(config_file, "w", encoding='windows-1252') as f:
        for line in lines:
            frameSize = 0.025
            frameStep = 0.01
            if line.startswith('frameSize'):
                new_line = "frameSize = " + segment_size
                f.write(new_line)
                f.write("\n")
            elif line.startswith('frameStep'):
                new_line = "frameStep = " + step_size
                f.write(new_line)
                f.write("\n")
            else:
                f.write(line)
    
def main(session_key, config_file, segment_size, step_size):    
    # Get audiofilename
    audio_dir = "static/uploads/" + session_key + "/"
    for file_name in os.listdir(audio_dir):
        if file_name[0] != ".":
            audio_name = file_name
            break
    # Get full path
    audio_path = audio_dir + file_name

    # If mp3, convert to wav
    if audio_path[-3:] == "mp3":
        wav_audio = AudioSegment.from_mp3(audio_path)
        audio_path = audio_path[:-3:] + "wav" # set new audio_path
        wav_audio.export(audio_path, format="wav")
    
    # Get metadata
    audio_duration = len(AudioSegment.from_wav(audio_path))

    # Create dir for ouput and set filenames
    output_dir = "static/data/" + session_key + "/"
    subprocess.call(["mkdir", output_dir])
    output_path = output_dir + audio_name.split(".")[0] + ".mfcc.htk"

    # Prepend path to config file
    config_file = '../opensmile-2.3.0/config/' + config_file

    # Update config file with segment- and steplength, divided by 1000 to get second-format
    update_config(config_file, str(segment_size/1000), str(step_size/1000))

    # Run opensmile to output features in output dir
    subprocess.call([smilextract, "-C", config_file, "-I", audio_path, "-O", output_path])

    # Read file, and return formatted data
    htk_reader = HTKFile()
    htk_reader.load(output_path)
    result = np.array(htk_reader.data)
    
    # Run data through t-SNE
    tsne = TSNE(n_components=2, perplexity=25)#, random_state=None)
    Y1 = tsne.fit_transform(result)
    print("t-SNE done")

    # Run data through PCA
    pca = PCA(n_components=2)
    Y2 = pca.fit_transform(result)
    print("PCA done")

    # Format t-SNE output to correct dictionary format
    data = []
    i = 0
    for coord1, coord2 in zip(Y1, Y2):
        data.append({"id":i, "tsneX":float(coord1[0]), "tsneY":float(coord1[1]), "pcaX":float(coord2[0]), "pcaY":float(coord2[1]), "start":int(i*step_size), "active":1, "color":"black"})
        #data.append({"id":i, "tsneX":random.randint(1,99), "tsneY":random.randint(1,99), "pcaX":random.randint(1,99), "pcaY":random.randint(1,99), "start":int(i*step_size), "active":1, "color":"black"})
        i+=1

    # Save data as csv to be able to load later
    keys = data[0].keys()
    with open(output_dir + "data.csv", 'w') as output_file:
        dict_writer = csv.DictWriter(output_file, keys)
        dict_writer.writeheader()
        dict_writer.writerows(data)

    # Save metadata as csv to be able to load later
    metadata = [{"audio_duration":audio_duration, "audio_path":audio_path, "segment_size":segment_size, "step_size":step_size}]
    keys = metadata[0].keys()
    with open(output_dir + "metadata.csv", 'w') as output_file:
        dict_writer = csv.DictWriter(output_file, keys)
        dict_writer.writeheader()
        dict_writer.writerows(metadata)

    #return data, audio_duration
