import QRReader from './vendor/qrscan.js';
import {snackbar} from './snackbar.js';
import styles from '../css/styles.css';
import isURL from 'is-url';

main();
function main() {
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
      copiedText = result;
      textBox.value = result;
      textBox.select();
      scanner.style.display = 'none';
      if (isURL(result)) {
        dialogOpenButton.style.display = 'inline-block';
      }
      dialogElement.classList.remove('app__dialog--hide');
      dialogOverlayElement.classList.remove('app__dialog--hide');
    });
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

function mounted(){
  if (window.localStorage.storedToken2) {
    this.tokenValid = true;
    this.token = window.localStorage.storedToken2;
}
fetch('https://apply.vandyhacks.org/api/events').then(res => {
    if (res.ok) {
        res.json().then(events => this.events = events.filter(event => event.open));
    }
});
}
let tokenHeader = function () {
  return new Headers({
      'x-event-secret': this.token,
      'Content-Type': 'application/json'
  });
}
let setToken = function () {
  if (!this.token) {
    return;
  }
    fetch('https://apply.vandyhacks.org/auth/eventcode/', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ token: this.token })
    }).then(res => {
        if (res.ok) {
            this.tokenValid = true;
            window.localStorage.storedToken2 = this.token;
        } else {
            this.authError = 'Invalid token';
        }
    });
}
let setEvent = function (eventId) {
    this.selectedEvent = eventId;
    this.scanning = true;
}
let displayAttendee = function (attendeeId) {
    var setInvalidQr = () => this.qrData = { invalid: true };
    fetch(`https://apply.vandyhacks.org/api/events/${this.selectedEvent}/admitted/${attendeeId}`, {
        headers: this.tokenHeader
    }).then(res => {
        if (res.ok) {
            res.json().then(el => this.qrData = el);
        } else {
            setInvalidQr();
        }
    }).catch(err => setInvalidQr());
}
let admitAttendee = function () {
    if (!this.qrData.invalid) {
        fetch(`https://apply.vandyhacks.org/api/events/${this.selectedEvent}/admit/${this.qrData._id}`, {
            headers: this.tokenHeader
        }).then(res => {
            res.json().then(console.log);
        });
    }
    this.returnToScan();
}
let unadmitAttendee = function () {
    if (!this.qrData.invalid) {
        fetch(`https://apply.vandyhacks.org/api/events/${this.selectedEvent}/unadmit/${this.qrData._id}`, {
            headers: this.tokenHeader
        }).then(res => {
            res.json().then(console.log);
        });
    }
    this.returnToScan();
}
let returnToScan = function () {
    this.qrData = null;
    this.scanning = true;
}
let typeColor = function (type) {
    return colorMap[type] || 'gray';
}
