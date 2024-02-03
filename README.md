# Web tool for Labeling

# Italiano

Semplice web app che permette di labellare ed esportare un set di immagini estratte da un file bag.

## Indice

- [Requisiti](#requisiti)
- [Installazione](#installazione)
- [Avvio del server](#avvio-del-server)
- [Utilizzo](#utilizzo)
    - [Estrarre dal file bag](#estrarre-dal-file-bag)
    - [Creare una classe](#creare-una-classe)
    - [Disegnare un bounding box](#disegnare-un-bounding-box)
    - [Navigare nel dataset](#navigare-nel-dataset)
    - [Esportazione](#esportazione)
- [Errori e bugs](#errori-e-bugs)

## Requisiti

- Ubuntu `20.04`
- Node.js `>= 14.21`

## Installazione

Una volta controllato di soddisfare i [requisiti](#requisiti) e aver scaricato la cartella contenente tutti i file, o tramite download o tramite comando
```bash
git clone https://github.com/aislabunimi/tesi.triennale.mangili
```

posizionarsi nella __root__ della cartella per installare tutte le dipendenze necessarie tramite comando
```bash
npm start
```

Appena terminato di installare tutte le dipendenze esterne, possiamo passare ad installare le librerie necessarie all'applicazione per funzionare
```bash
npm install
```

## Avvio del server

Una volta installate tutte le dipendenze con successo, è possibile avviare l'applicazione con il seguente comando:
 ```bash
node src/server.js
```

## Utilizzo

### Estrarre dal file bag

Dopo aver avviato il server, è necessario selezionare il file bag che si desidera estrarre. Questo file deve essere presente all'interno della cartella `src/bag_file/`. Il processo di estrazione dei topics potrebbe richiedere diversi minuti, a seconda delle dimensioni del file. Una volta completato, sarete reindirizzati alla pagina di labeling.

Dopo aver terminato il processo di estrazione, non sarà più necessario eseguirlo per quel file bag, poiché sarà sufficiente caricare l'istanza già salvata selezionandola dalla lista a destra.

![home](https://github.com/aislabunimi/tesi.triennale.mangili/assets/86318455/0221e234-2c7e-472e-b814-27421ffa14a8)

### Creare una classe

Per iniziare il processo di labeling di un'immagine, è necessario prima creare una classe utilizzando il pulsante situato nella parte superiore della colonna di sinistra. Il nome della classe appena creata non deve corrispondere né a un nome già in uso, né al colore assegnato a un'altra classe.

Se si desidera aumentare ulteriormente la precisione dell'annotazione, è possibile aggiungere una sottoclasse tramite il pulsante nella parte superiore della colonna di destra. In questo caso, anche il nome della sottoclasse non può essere identico a quello di altre sottoclassi all'interno della stessa classe.

Per eliminare una classe o una sottoclasse, è sufficiente fare doppio clic sulla classe o sottoclasse desiderata, eliminando tutti i relativi bounding box associati.
Per modificare il nome di una classe, invece, è possibile fare clic con il tasto destro sulla classe da modificare e inserire il nuovo nome desiderato.

### Disegnare un bounding box

Per iniziare ad annotare gli oggetti, è necessario selezionare la classe di riferimento e utilizzare la combinazione di tasti `Ctrl + clic sinistro del mouse` per iniziare a tracciare il rettangolo che delimita l'oggetto in questione. Una volta creato, è possibile eseguire operazioni di ridimensionamento, spostamento e rimozione (utilizzando la selezione e il tasto `Canc` per rimuovere), ma è importante notare che il bounding box non può essere creato, spostato o ridimensionato al di fuori dello spazio di lavoro.

> Le scritte all'interno del bounding box non sono selezionabili, quindi se il bounding box è molto piccolo, per spostarlo è necessario selezionare i lati.

Per copiare i bounding box da un'immagine alla successiva, è possibile attivare la casella di controllo `keep bounding box`. Tuttavia, è importante prestare attenzione al fatto che tenere premuto o cliccare rapidamente il tasto per passare all'immagine successiva potrebbe causare la mancata copia dei bounding box per quella specifica immagine.

### Navigare nel dataset

Ogni volta che si cambia il topic di lavoro, verrà caricata l'ultima immagine visitata per quel topic.

Per spostarsi all'immagine successiva o precedente, è possibile utilizzare rispettivamente i tasti `.` e `,`. Per velocizzare il processo, ci sono due pulsanti disponibili: `reset to first image` per tornare alla prima immagine e `reload from last image` per tornare all'ultima immagine visitata.

Un'altra funzione utile permette di selezionare un gruppo di immagini attraverso la scelta dei __fps__ posti in basso a sinistra. È importante notare che il valore degli fps non può essere inferiore o uguale a zero.

È possibile visualizzare l'ultimo bounding box disegnato per una classe facendo clic sul pulsante accanto al nome della classe.

### Esportazione

Attraverso il pulsante situato nella parte inferiore, è possibile selezionare i topic da esportare nella cartella `src/export/nome_dataset/`. Per ciascun topic esportato, verrà creata una cartella che include a sua volta due sottocartelle: una denominata `/label` contenente un file __JSON__ per ciascuna immagine, rappresentando tutti i bounding box disegnati per quella specifica immagine, e una cartella `/message` che contiene l'immagine salvata nel formato `.png`.

![label](https://github.com/aislabunimi/tesi.triennale.mangili/assets/86318455/e68a3f57-bf59-4596-8a5d-dcf2afe866b8)

## Errori e bugs

In caso di errori, apri un nuovo [issue](https://github.com/aislabunimi/tesi.triennale.mangili/issues) e riporta l'errore incontrato.

# English

A simple web application that allows you to label and export a set of images extracted from a bag file.

## Index

- [Requirements](#requirements)
- [Installation](#installation)
- [Server startup](#server-startup)
- [Usage](#usage)
    - [Extract from bag file](#extract-from-bag-file)
    - [Create a class](#create-a-class)
    - [Draw a bounding box](#draw-a-bounding-box)
    - [Dataset Navigation](#dataset-navigation)
    - [Export](#export)
- [Errors and Bugs](#errors-and-bugs)

## Requirements

- Ubuntu `20.04`
- Node.js `>= 14.21`

## Installation

Once you have confirmed that you meet the [requirements](#requirements) and have downloaded the folder containing all the files, either through download or using the following command:
```bash
git clone https://github.com/aislabunimi/tesi.triennale.mangili
```

Navigate to the __root__ of the folder to install all necessary dependencies using the command:
```bash
npm start
```

After successfully installing all external dependencies, you can proceed to install the libraries required for the application to function:
```bash
npm install
```

## Server startup

Once all dependencies are successfully installed, you can start the application with the following command:
```bash
node src/server.js
```

## Usage

### Extract from bag file

After starting the server, you need to select the bag file you want to extract. This file must be located inside the `src/bag_file/` folder. The process of extracting topics may take several minutes, depending on the file's size. Once completed, you will be redirected to the labeling page.

After finishing the extraction process, there is no need to run it again for that bag file. You can simply load the previously saved instance by selecting it from the list on the right.

![home](https://github.com/aislabunimi/tesi.triennale.mangili/assets/86318455/0221e234-2c7e-472e-b814-27421ffa14a8)

### Create a class

To start the image labeling process, you must first create a class using the button at the top of the left column. The name of the newly created class must not match an existing name or the color assigned to another class.

If you wish to further enhance annotation precision, you can add a subclass using the button at the top of the right column. In this case, the subclass name must also be unique within the same class.

To delete a class or subclass, simply double-click on the desired class or subclass, which will delete all associated bounding boxes. To change the name of a class, right-click on the class you want to edit and enter the desired new name.

### Draw a bounding box

To begin annotating objects, select the reference class and use the `Ctrl + left mouse click` combination to start drawing the rectangle that outlines the object in question. Once created, you can perform resizing, moving, and removal operations (using selection and the `Canc` key to remove). However, it's important to note that the bounding box cannot be created, moved, or resized outside the workspace.

> Text inside the bounding box is not selectable, so if the bounding box is very small, you need to select the sides to move it.

To copy bounding boxes from one image to the next, you can enable the `keep bounding box` checkbox. However, be cautious that holding down or quickly clicking the button to move to the next image might result in the bounding boxes not being copied for that specific image.

### Dataset navigation

Each time you change the working topic, the last visited image for that topic will be loaded.

To navigate to the next or previous image, you can use the `.` and `,` keys, respectively. To expedite the process, there are two available buttons: `reset to first image` to return to the first image and `reload from the last image` to return to the last visited image.

Another useful feature allows you to select a group of images by choosing the __fps__ located at the bottom left. It's important to note that the fps value cannot be less than or equal to zero.

You can view the last drawn bounding box for a class by clicking the button next to the class name.

### Export

Through the button at the bottom, you can select topics to export to the `src/export/dataset_name/` folder. For each exported topic, a folder will be created, which includes two subfolders: one named `/label` containing a __JSON__ file for each image, representing all the drawn bounding boxes for that specific image, and a `/message` folder containing the image saved in `.png` format.

![label](https://github.com/aislabunimi/tesi.triennale.mangili/assets/86318455/e68a3f57-bf59-4596-8a5d-dcf2afe866b8)

## Errors and Bugs

In case of errors, please open a new [issue](https://github.com/aislabunimi/tesi.triennale.mangili/issues) and report the encountered error.