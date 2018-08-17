import QRReader from './vendor/qrscan.js';
import {snackbar} from './snackbar.js';
import styles from '../css/styles.css';
import isURL from 'is-url';

let selectedEvent = null;
let scanning = false;
let qrData = null;
let events = [];
let token = "";
let tokenValid = false;
let authError = null;
function tokenHeader() {
  return new Headers({
      'x-event-secret': token,
      'Content-Type': 'application/json'
  });
};

main();
function main() {
  if (window.localStorage.storedToken2) {
    tokenValid = true;
    token = window.localStorage.storedToken2;
  }

  fetch('http://localhost:3000/api/events').then(res => {
    if (res.ok) {
        res.json().then(ev => events = ev.filter(event => event.open));
    }
  });

  setupServiceWorker();
  window.addEventListener("DOMContentLoaded", onDOMContentLoad);
}

function setupServiceWorker() {
  // If service worker is installed, show offline usage notification
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      if (!localStorage.getItem("offline")) {
        localStorage.setItem("offline", true);
        snackbar.show('App is ready for offline usage.', 5000);
      }
    });
  }

  //To generate sw.js file
  if (process.env.NODE_ENV === 'production') {
    require('offline-plugin/runtime').install();
  }
}

function onDOMContentLoad() {
  let copiedText;
  let frame;
  const selectPhotoButton = document.querySelector('.app__select-photos');
  const dialogElement = document.querySelector('.app__dialog');
  const dialogOverlayElement = document.querySelector('.app__dialog-overlay');
  const dialogOpenButton = document.querySelector('.app__dialog-open');
  const dialogCloseButton = document.querySelector('.app__dialog-close');
  const scanner = document.querySelector('.custom-scanner');
  const textBox = document.querySelector('#result');
  const helpText = document.querySelector('.app__help-text');
  const infoSvg = document.querySelector('.app__header-icon svg');
  const videoElement = document.querySelector('video');
  window.appOverlay = document.querySelector('.app__overlay');
    
  // Setup event listeners
  window.addEventListener('load', (event) => {
    QRReader.init("#cam");

    // Set camera overlay size
    setTimeout(() => { 
      setCameraOverlay();
      scan();
    }, 1000);
  });
  dialogCloseButton.addEventListener('click', hideDialog, false);
  dialogOpenButton.addEventListener('click', openInBrowser, false);

  function setCameraOverlay() {
    window.appOverlay.style.borderStyle = 'solid';
    helpText.style.display = 'block';
  }

  //To open result in browser
  function openInBrowser() {
    window.open(copiedText, '_blank', 'toolbar=0,location=0,menubar=0');
    copiedText = null;
    hideDialog();
  }

  function scan() {
    scanner.style.display = 'block';

    QRReader.scan(result => {
      console.log(result);
      let fetchData = { 
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ 'token': result })
      }
      copiedText = result;
      textBox.value = result;
      textBox.select();
      scanner.style.display = 'none';
      if (isURL(result)) {
        dialogOpenButton.style.display = 'inline-block';
      }
      dialogElement.classList.remove('app__dialog--hide');
      dialogOverlayElement.classList.remove('app__dialog--hide');
      fetch('http://localhost:3000/auth/eventcode', fetchData).then(res => {
        if (res.ok) {
            tokenValid = true;
            window.localStorage.storedToken2 = token;
            console.log(res);
        } else {
            authError = 'Invalid token';
        }
      })
    });
  }

  function setEvent(eventId) {
    selectedEvent = eventId;
    scanning = true;
  }

  function displayAttendee(attendeeId) {
    var setInvalidQr = () => qrData = { invalid: true };
    fetch(`http://localhost:3000/api/events/${selectedEvent}/admitted/${attendeeId}`, {
        headers: tokenHeader
    }).then(res => {
        if (res.ok) {
            res.json().then(el => qrData = el);
        } else {
            setInvalidQr();
        }
    }).catch(err => setInvalidQr());
  }

  function admitAttendee() {
    if (!qrData.invalid) {
        fetch(`http://localhost:3000/api/events/${selectedEvent}/admit/${qrData._id}`, {
            headers: tokenHeader
        }).then(res => {
            res.json().then(console.log);
        });
    }
    returnToScan();
  }

  function unadmitAttendee() {
    if (!qrData.invalid) {
        fetch(`http://localhost:3000/api/events/${selectedEvent}/unadmit/${qrData._id}`, {
            headers: tokenHeader
        }).then(res => {
            res.json().then(console.log);
        });
    }
    returnToScan();
  }

  function returnToScan() {
    qrData = null;
    scanning = true;
  }

  function hideDialog() {
    copiedText = null;
    textBox.value = "";

    dialogElement.classList.add('app__dialog--hide');
    dialogOverlayElement.classList.add('app__dialog--hide');
    scan();
  }

  function createFrame() {
    frame = document.createElement('img');
    frame.src = '';
    frame.id = 'frame';
  }

  function selectFromPhoto() {
    if (videoElement) {
      videoElement.remove();
    }
    
    // Creating the camera element
    const camera = document.createElement('input');
    camera.setAttribute('type', 'file');
    camera.setAttribute('capture', 'camera');
    camera.id = 'camera';
    helpText.textContent = '';
    helpText.style.color = '#212121';
    helpText.style.bottom = '-60px';
    infoSvg.style.fill = '#212121';
    window.appOverlay.style.borderStyle = '';
    selectPhotoButton.style.color = "#212121";
    selectPhotoButton.style.display = 'block';
    createFrame();

    // Add the camera and img element to DOM
    var pageContentElement = document.querySelector('.app__layout-content');
    pageContentElement.appendChild(camera);
    pageContentElement.appendChild(frame);

    // Click of camera fab icon
    selectPhotoButton.addEventListener('click', () => {
      scanner.style.display = 'none';
      document.querySelector("#camera").click();
    });
    
    // On camera change
    camera.addEventListener('change', (event) => {
      if (event.target && event.target.files.length > 0) {
        frame.className = 'app__overlay';
        frame.src = URL.createObjectURL(event.target.files[0]);
        scanner.style.display = 'block';
        window.appOverlay.style.borderColor = '#212121';
        scan();
      }
    });
  }
}
