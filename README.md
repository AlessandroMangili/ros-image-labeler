# Web tool for Labeling

Semplice web app che permette di labellare un set di immagini estratte da un file bag.

Una volta avviato il server, l'app presenta la pagina home in cui si ha la possibilità o di caricare un file bag e quindi di estrarre il suo contenuto e creare un'instanza locale, oppure di selezionare una delle istanze locali già presenti per accedere all'area di annotazione.

Una volta selezionata l'istanza locale, verremo ridirezionati all'interno della pagina di annotazione che si presenta con due colonne, una a sinistra e una a destra, e al centro troveremo un riquadro contenente la prima immagine del topic selezionato. \
In alto troveremo altre due funzionalità: una selezione per cambiare il topic su cui stiamo lavorando, e una checkbox che servirà per mantenere i bounding box così da non dover ricrearli per ogni immagine.

Nella colonna di sinistra troviamo un pulsante che ci permette di creare una classe per i bounding box con il rispettivo colore, mentre nella colonna di destra, ci sarà una checkbox da spuntare ogni qualvolta si ha la necessità di dover creare delle sotto-classi per migliorare la granularità dell'annotazione.

Prima di poter disegnare un buonding box, è necessario creare e selezionare una delle classi create, e con la combinazione di tasti `ctrl + click mouse` è possibile trascinando creare i bounding box.

Sui bounding box è possibile compiere operazioni di rotazione, traslazione e ridimensionamento, inoltre è possibile cancellarli selezionando il bounding box da rimuovere, e premere il tasto `canc`. Per rimuovere tutti i bounding box della classe, senza doverlo fare a mano uno a uno, è possibile con un doppio click sulla classe/sotto-classe da rimuovere, per cancellare tutti i bounding box disegnati con quella classe.

Una volta finito di labellare l'intero set di immagini, è possibile esportare il set di immagini labellate, salvate all'interno dell'istanza locale di MongoDB.

## Dipendenze

- Ubuntu 20.04 (fortemente consigliata)
- ROS noetic
  - Pacchetto `ros-noetic-mongodb-store`
- NodeJS versione dalla `14` a salire 
  - `npm install opencv4nodejs`
    - Per installare `opencv4nodejs`, bisogna prima avere __cmake__ e __git__ installati
- `python-is-python3` (?)
- `pip install pymongo==2.7` 

## Consigli

Ogni volta che si riavvia il sistema, bisogna fermare il processo MongoDB con `sudo systemctl stop mongodb`.

---

## English
