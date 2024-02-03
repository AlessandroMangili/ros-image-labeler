from generic_dataset.utilities.save_load_methods import save_cv2_image_bgr, load_cv2_image_bgr, \
    save_compressed_numpy_array, load_compressed_numpy_array
from typing import NoReturn
import cv2
import numpy as np
from generic_dataset.generic_sample import synchronize_on_fields
from generic_dataset.sample_generator import SampleGenerator
from generic_dataset.dataset_folder_manager import DatasetFolderManager
import os
import json

COLORS = {0: (0, 0, 255), 1: (0, 255, 0)}
DOOR_LABELS = {0: 'Closed door', 1: 'Open door'}
DATASET_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dataset')

@synchronize_on_fields(field_names={'bgr_image', 'bounding_boxes'}, check_pipeline=True)
def visualize(self) -> NoReturn:
    bgr_image = self.get_bgr_image()
    img_bounding_boxes = bgr_image.copy()

    for label, *box in self.get_bounding_boxes():
        cv2.rectangle(img_bounding_boxes, box, color=COLORS[label], thickness=1)

    row_1 = np.concatenate(bgr_image, axis=1)
    row_1 = np.concatenate((row_1, img_bounding_boxes), axis=1)

    cv2.imshow('Sample', row_1)
    cv2.waitKey()

# The bounding_boxes field is a numpy array of list [[label, x1, y1, width, height]],
# where label is the bounding box label and (x1, y1) are the coordinates of the top left point and width height the bbox dimension

DoorSample = SampleGenerator(name='DoorSample', label_set={0, 1}) \
    .add_dataset_field(field_name='bgr_image', field_type=np.ndarray, save_function=save_cv2_image_bgr, load_function=load_cv2_image_bgr) \
    .add_dataset_field(field_name='bounding_boxes', field_type=np.ndarray, default_value=np.array([]), load_function=load_compressed_numpy_array, save_function=save_compressed_numpy_array) \
    .add_custom_method(method_name='visualize', function=visualize) \
    .generate_sample_class()

def generate_dataset(path, dataset_name):
    try:
        database = DatasetFolderManager(dataset_path=DATASET_PATH, folder_name=dataset_name, sample_class=DoorSample, max_treads=8)
        # Reads the two folders that respectively contain the image and its corresponding bounding boxes
        message = os.listdir(os.path.join(path, 'message'))
        label = os.listdir(os.path.join(path, 'label'))
    except FileNotFoundError as error:
        print(f"Folder not found at the following path {str(path)} with the error: {str(error)}")
        return

    # Check if the number of images is equal to the number of files containing bounding boxes
    if len(label) != len(message):
        print("The lenght of two folders is not the same")
        return

    # Just sort the sequence number
    try:
        message = sorted(message, key = lambda x: int(x.split('.')[0]))
        label = sorted(label, key = lambda x: int(x.split('.')[0]))

        for index in range(0, len(label)):
            bbox = read_bounding_boxes(os.path.join(path, 'label', label[index]))
            image = read_image(os.path.join(path, 'message', message[index]))
            if image is None:
                return
            if len(bbox) == 0:
                generated_sample = DoorSample(label=0).set_bgr_image(value=image)
            else:
                generated_sample = DoorSample(label=1).set_bgr_image(value=image).set_bounding_boxes(value=bbox)
            database.save_sample(generated_sample, use_thread=False)

        # Save folder metadata to file
        database.save_metadata()
        return
    except RuntimeError as error:
        print(f"Error on saving dataset with the error: {str(error)}")

def read_bounding_boxes(path):
    f = open(path)
    list = []

    data = json.load(f)

    for i in data['bounding_box']:
        flag = 1
        # Check if the door is labeled as closed
        if i['id_sub_class'] == 0:
            flag = 0
        list.append([flag, i['rect']['attrs']['x'], i['rect']['attrs']['y'], i['rect']['attrs']['width'], i['rect']['attrs']['height']])
    f.close()
    return np.array(list)

def read_image(path):
    image = cv2.imread(path)
    if image is None:
        print('Impossibile leggere l\'immagine.')
        return None
    return image

def select_dataset(path):
    folders = [folder for folder in os.listdir(path) if os.path.isdir(os.path.join(path, folder))]
    index = 0
    print("Select one of those folders:")
    for folder in folders:
        print(f"{index} - {str(folder)}")
        index += 1
    while True:
        choose = input()
        if choose >= "0" and choose < str(len(folder)):
            break
    
    return folders[int(choose)]

if __name__ == "__main__":
    dataset_name = input("Insert the name of the dataset: ")
    print("")
    path = "src/export"
    path += "/" + select_dataset(path)
    path += "/" + select_dataset(path)
    print(f"Generating the dataset by taking the data from {str(path)}")
    generate_dataset(path, dataset_name)