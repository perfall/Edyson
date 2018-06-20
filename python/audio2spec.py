import sys
from scipy.io import wavfile
#import matplotlib.pyplot as plt
import subprocess
import PIL
import numpy as np
from pydub import AudioSegment
from PIL import Image, ImageChops
import unicodedata
import os
import shutil
from time import gmtime, strftime

PIXEL_LIMIT = 200000

def create_spectrogram(sound_file, X, y):
    """Create spectrogram(s), maxlenght 200 000 pixels"""
    spec_file = sound_file.split("/")[-1].split(".")[0] + "_X" + X + "_y" + y + ".png"
    
    sound = AudioSegment.from_wav(sound_file)
    if len(sound)*(int(X)/1000) <= PIXEL_LIMIT: # max pixel limit
        command = "sox "+ sound_file + " -n spectrogram -l -r -m -w Hamming -y " + y + " -X " + X + " -o " + spec_file
        subprocess.call(command.split())
        return spec_file

    # If large file segment into chunks of smaller spectrogram and concatenate later
    chunk_size = int((PIXEL_LIMIT/int(X))*1000)
    start, stop = 0, chunk_size

    # Temporary folders to store temporary data in
    os.makedirs("sound_chunks")
    os.makedirs("spec_chunks")
    
    chunk_files = []
    chopping = True
    while chopping:
        if stop > len(sound):
            stop = len(sound)
            chopping = False

        # Create sound chop
        chunk_file = "chunk" + str(start) + "-" + str(stop)
        sound_chunk = sound[start:stop]
        sound_chunk.export("sound_chunks/" + chunk_file + ".wav", format="wav")
        
        # Create spectrogram chop
        command = "sox sound_chunks/"  + chunk_file + ".wav -n spectrogram -l -r -m -w Hamming -y " + y + " -X " + X + " -o spec_chunks/" + chunk_file + ".png"
        subprocess.call(command.split())

        # Remember filenames for concatenation later
        chunk_files.append("spec_chunks/" + chunk_file + ".png")
        start += chunk_size
        stop += chunk_size

    # Concatenate spectrograms into a big one
    cat_command = "convert "
    for chunk_file in chunk_files:
        cat_command+= chunk_file + " "
    cat_command += "+append " + spec_file
    subprocess.call(cat_command.split())
    shutil.rmtree("sound_chunks")
    shutil.rmtree("spec_chunks")
    return spec_file

def segment(sound_file, spec_file, ms_step, pix_per_s, sound_output_dir, spec_output_dir):
    """Segments sounds and spectrograms according to set parameters and places them in separate folders"""
    pix_per_ms = pix_per_s/1000
    sound = AudioSegment.from_wav(sound_file)
    start, stop = 0, ms_step
    start_pixel, stop_pixel = start*pix_per_ms, stop*pix_per_ms
    spec = Image.open(spec_file)
    chopping = True
    while stop <= len(sound):
        
        # Split sound
        chunk = sound[start:stop]
        chunk.export(sound_output_dir + sound_file.split("/")[-1].split(".")[0] + "_" + str(start) + "-" + str(stop) + ".wav", format="wav")

        # Split spectrogram
        w, h = spec.size
        cropped_spec = spec.crop((start_pixel, 0, stop_pixel, h))
        cropped_spec.save(spec_output_dir + sound_file.split("/")[-1].split(".")[0] + "_" + str(start) + "-" + str(stop) + ".png")

        start += ms_step
        stop += ms_step
        start_pixel, stop_pixel = start*pix_per_ms, stop*pix_per_ms

#def manual_segment(sound_file, spec_file, ms_step, pix_per_s, sound_output_dir, spec_output_dir):


def read_settings():
    X = str(1000)
    y = str(65)
    ms = str(100)
    return [X, y, ms]

def main(X, y, ms_step, sound_dir, output_dir, manual_segment):
    # Create/overwrite output folders
    sound_output_dir = output_dir + "/sounds/"
    spec_output_dir = output_dir + "/spectrograms/"
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    os.makedirs(sound_output_dir)
    os.makedirs(spec_output_dir)

    
    
    # Main process
    if manual_segment:
        with open(manual_segment, "r") as segment_file:
            i=0
            prev_sound_file = None
            for line in segment_file:
                print(i)
                line = line.split()
                sound_file, start, stop, label = line[0], int(line[1]), int(line[2]), line[3]
                start_pixel, stop_pixel = start*(int(X)/1000), stop*(int(X)/1000)
                
                if sound_file != prev_sound_file:
                    if i != 0:
                        os.remove(spec_file)
                    spec_file = create_spectrogram(sound_dir + "/" + sound_file, X, y)
                    spec = Image.open(spec_file)

                # Split sound
                sound = AudioSegment.from_wav(sound_dir + "/" + sound_file)
                chunk = sound[start:stop]
                chunk.export(sound_output_dir + label + "_" + str(start) + "-" + str(stop) + ".wav", format="wav")

                # Split spectrogram
                w, h = spec.size
                cropped_spec = spec.crop((start_pixel, 0, stop_pixel, h))
                cropped_spec.save(spec_output_dir + label + "_" + str(start) + "-" + str(stop) + ".png")

                prev_sound_file = sound_file
                i+=1

    else:
        for sound_file in os.listdir(sound_dir):
            if sound_file.startswith('.'): # Avoid hidden files
                continue
            print("Processing ", sound_file, "...")
            sound_file = sound_dir + "/" + unicodedata.normalize('NFC', sound_file) # For handling åäö
            spec_file = create_spectrogram(sound_file, X, y)
            segment(sound_file, spec_file, int(ms_step), int(X), sound_output_dir, spec_output_dir)
            os.remove(spec_file)

        # # Save info of run
        # info_fname = output_dir + "/info.txt"
        # with open(info_fname, "w") as info_file:
        #     info_file.write("X:" + X + "\ny:" + y + "\nms_step:" + ms_step + "\noutput_dir:" + output_dir + "\ncreated:" + strftime("%a, %d %b %Y %H:%M:%S +0000", gmtime()))
    
    


if __name__ == '__main__':
    X, y, ms_step = read_settings()
    sound_dir, output_dir, manual_segment = sys.argv[1], sys.argv[2], False
    if len(sys.argv) == 4:
        manual_segment = sys.argv[3]
    main(X, y, ms_step, sound_dir, output_dir, manual_segment)
    print("DONE")
    
