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

const EVENT_URL = 'https://apply.vandyhacks.org/api/events';
let EVENT_ID = '5ba688091834080020e18db8';

function tokenHeader() {
  return new Headers({
      'x-event-secret': token,
      'Content-Type': 'application/json'
  });
};

main();
// checkPasscode();

function main() {
  console.log(1);
  if (window.localStorage.storedToken2) {
    tokenValid = true;
    token = window.localStorage.storedToken2;
  }
  console.log(2);

  fetch('https://apply.vandyhacks.org/auth/eventcode/').then(res => {
    if (res.ok) {
        res.json().then(ev => events = ev.filter(event => event.open));
    }
  });
  console.log(3);

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
    console.log(4);

    // Set camera overlay size
    setTimeout(() => { 
      setCameraOverlay();
      checkPasscode();
      // scan();
    }, 1000);
  });
  dialogCloseButton.addEventListener('click', hideDialog, false);
  // dialogOpenButton.addEventListener('click', openInBrowser, false);

  function setCameraOverlay() {
    window.appOverlay.style.borderStyle = 'solid';
    helpText.style.display = 'block';
  }

  // //To open result in browser
  // function openInBrowser() {
  //   window.open(copiedText, '_blank', 'toolbar=0,location=0,menubar=0');
  //   copiedText = null;
  //   hideDialog();
  // }


  function showResult(res) {
    scanner.style.display = 'none';
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

  function checkPasscode() {
    console.log('check');

    document.getElementById('submitCheck').addEventListener('click',() => {
      token = document.getElementById('checker').value;
      setToken();
    })
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
      console.log(result);
      tokenValid = true;
      window.localStorage.storedToken2 = token;
      displayAttendee(showResult, result);
    });
  }

  function setToken() {
    console.log(token);
    console.log("pls");
    fetch('https://apply.vandyhacks.org/auth/eventcode/', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ token: token })
    }).then(res => {
        if (res.ok) {
            scan();
            tokenValid = true;
            window.localStorage.storedToken2 = token;
        } else {
            console.log('invalid');
            authError = 'Invalid token';
        }
    });
  }

  function setEvent(eventId) {
    selectedEvent = eventId;
    scanning = true;
  }

  function displayAttendee(callback, res) {
    const header = tokenHeader();
    admitAttendee(res);
    let setInvalidQr = () => invalid = true;
    console.log('displayatt ' + res);
    fetch(`${EVENT_URL}/${EVENT_ID}/admitted/${res}`, {
      headers: header
    }).then(resp => {
        if (resp.ok) {
            console.log('resp is ' + resp);
            callback(resp);
            // resp.json().then(el => {qrData = el}).then(() =>callback(qrData)).then(() => checkAdmit(qrData,res));
        } else {
            console.log('invalid id');
            setInvalidQr().then((() => callback(qrData)));
        }
        // checkAdmit();
    });
    //.catch(err => setInvalidQr());
  }

  function admitAttendee(id) {
    const header = tokenHeader();
    if (!invalid) {
        fetch(`${EVENT_URL}/${EVENT_ID}/admit/${id}`, {
            headers: header
        })
        .then(res => {
            console.log(res.json());
            res = { headers: 'admitted' }
        });
    }
    returnToScan();
  }

  function unadmitAttendee(id) {
    const header = tokenHeader();
    console.log('unadmit');
    if (!invalid) {
        fetch(`${EVENT_URL}/${EVENT_ID}/unadmit/${id}`, {
            headers: header
        }).then(res => {
            res = { headers: unadmitted }
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
