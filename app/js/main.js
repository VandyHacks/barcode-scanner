import QRReader from './vendor/qrscan.js';
import {snackbar} from './snackbar.js';
import styles from '../css/styles.css';
import isURL from 'is-url';

let selectedEvent = null;
let scanning = false;
let qrData = [];
let invalid = false;
let events = [];
let token = "";
let tokenValid = false;
let authError = null;
let attendees = [];

function tokenHeader() {
  return new Headers({
      'x-event-secret': 'dinner',
      'Content-Type': 'application/json'
  });
};

main();
function main() {
  let fdata = {
      method: 'Get',
      headers: new Headers({ 'Content-Type': 'application/json' })
  }

  if (window.localStorage.storedToken2) {
    tokenValid = true;
    token = window.localStorage.storedToken2;
  }

  fetch('https://vhs-regi.herokuapp.com/auth/eventcode').then(res => {
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

  function checkAdmit(res) {
    if(!invalid) {
      console.log(res.status);
      if(!res.status.admitted) {
        admitAttendee();
      } else {
        unadmitAttendee();
      }
    }
  };

  function showResult(res) {
    textBox.innerHTML = '';
    let info = [res.status.name,res.email,res.__v, res.status.confirmed, res.admittedToEvent];
    let props = ['Name: ', 'Email: ', 'School: ', 'Confirmed: ', 'Admitted: '];
    if (!invalid) {
      info.forEach(element => {
        const tag = '<p>' + props.shift() + element + '</p>';
        textBox.innerHTML += tag;
      });
    } else {
      textBox.innerHTML = 'Not valid attendee';
    }
    if (isURL(result)) {
      dialogOpenButton.style.display = 'inline-block';
    }
    dialogElement.classList.remove('app__dialog--hide');
    dialogOverlayElement.classList.remove('app__dialog--hide');
  }

  function scan() {
    scanner.style.display = 'block';
    setEvent();
    QRReader.scan(result => {
      scanner.style.display = 'none';
      let fetchData = { 
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ 'token': 'dinner', 'body':'stuff'})
      }
      fetch('https://vhs-regi.herokuapp.com/auth/eventcode/', fetchData).then(res => {
        if (res.ok) {
            tokenValid = true;
            window.localStorage.storedToken2 = token;
            displayAttendee(showResult);
        } else {
            console.log('invalid token');
            authError = 'Invalid token';
        }
      })
    });
  }

  function setEvent(eventId) {
    selectedEvent = eventId;
    scanning = true;
  }

  function displayAttendee(callback) {
    let setInvalidQr = () => invalid = true;
    fetch(`https://vhs-regi.herokuapp.com/api/events/5b817a84f4ca5c4f4201ab15/admitted/5b74924e839afd513227bbc3`).then(res => {
        if (res.ok) {
            console.log('ok');
            res.json().then(el => {qrData = el}).then(() =>callback(qrData)).then(() => checkAdmit(qrData));
        } else {
            console.log('what');
            setInvalidQr().then((() => callback(qrData)));
        }
        // checkAdmit();
    });
    //.catch(err => setInvalidQr());
  }

  function admitAttendee() {
    console.log('admit');
    if (!invalid) {
      console.log('okkk');
        fetch(`https://vhs-regi.herokuapp.com/api/events/5b817a84f4ca5c4f4201ab15/admit/5b74924e839afd513227bbc3`, {
            headers: tokenHeader
        })
        // .then(res => {
        //     console.log(res.json());
        //     res = { headers: 'admitted' }
        // });
    }
    returnToScan();
  }

  function unadmitAttendee() {
    console.log('unadmit');
    if (!invalid) {
        fetch(`https://vhs-regi.herokuapp.com/api/events/5b817a84f4ca5c4f4201ab15/unadmit/5b74924e839afd513227bbc3`, {
            headers: tokenHeader
        }).then(res => {
            res = { headers: unadmitted }
            res.json().then(console.log);
        });
    }
    returnToScan();
  }

  function returnToScan() {
    qrData = null;
    scanning = true;
    invalid = false;
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
