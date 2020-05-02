import * as firebase from "firebase/app";
import "firebase/analytics";
import "firebase/auth";
import "firebase/firestore";
import * as d3 from "d3";

const SCHOOL_COLORS = {
  "umich.edu": {
    school_name: "University of Michigan",
    main: "#FFCB05",
    text: "#00274C",
    gradient: ["#00274C", "#0d3264", "#3e5bbb"],
    message: "Congrats, and forever #GoBlue!",
    hashtag: "#MGoGrad",
  },
  "gatech.edu": {
    school_name: "Georgia Tech",
    main: "#B3A369",
    text: "#FFF",
    gradient: ["#EAAA00", "#B7C42F", "#F5D580"],
    message: "Congrats, and go yellow jackets!",
    hashtag: "#GT20",
  },
};

let SCHOOL_CONFIG = SCHOOL_COLORS["umich.edu"];

const magnitude = (x, y, z) => {
  return Math.sqrt(x ** 2 + y ** 2 + z ** 2);
};

const QUERY_RATE = 60; // times per second
const BUFFER_TIME = 5; // seconds
const ZERO_G_THRESH = 1.5; // meters per second squared
const CATCH_THRESH = 5;
const GRAVITY = 9.81; // meters per second squared

const acc_buffer = Array.from(Array(QUERY_RATE * BUFFER_TIME));
acc_buffer.fill(GRAVITY);

const pushBuffer = (magnitude) => {
  acc_buffer.shift();
  acc_buffer.push(magnitude);
};

const selectSchool = () => {
  const dl = document.querySelector('datalist');
  for (let key in SCHOOL_COLORS) {
    let opt = document.createElement('option');
    opt.innerText = SCHOOL_COLORS[key].school_name;
    opt.value = key;
    dl.appendChild(opt);
  }
  const sel = document.querySelector('input#school-select');
  sel.addEventListener('input', function (e) {
    if (e.target.value in SCHOOL_COLORS) {
      document.querySelector('.overlay').style.display = 'none';
      setSchool(e.target.value);
    }
  })
}

const setSchool = (school) => {
  if (school in SCHOOL_COLORS) {
    SCHOOL_CONFIG = SCHOOL_COLORS[school];
  }
  document.querySelector("body").style.color = SCHOOL_CONFIG.text;
  document.querySelector("body").style.backgroundColor = SCHOOL_CONFIG.main;
  const gradient = document.querySelector("#_Linear1");
  gradient
    .querySelectorAll("stop")
    .forEach((el, ind) => (el.style.stopColor = SCHOOL_CONFIG.gradient[ind]));
};

const detectThrowEnd = () => {
  if (
    d3.mean(acc_buffer.slice(-10, -5)) < ZERO_G_THRESH + 1 &&
    d3.mean(acc_buffer.slice(-5)) > CATCH_THRESH
  ) {
    console.log("fall!");
    console.log(acc_buffer.slice(-150, -100));
    console.log(acc_buffer.slice(-100, -50));
    console.log(acc_buffer.slice(-50));
    // look for number of contiguous ~0 acceleration instances
    let zeros = 0;
    let running_zeros = 0;
    for (let i = 0; i < acc_buffer.length; ++i) {
      if (acc_buffer[i] > ZERO_G_THRESH) {
        if (running_zeros > zeros) zeros = running_zeros;
        running_zeros = 0;
      } else {
        running_zeros++;
      }
    }
    // calculate time based on count
    let time = (zeros * 1.0) / QUERY_RATE;
    // calculate distance based on time
    // we want to divide by 2 because half the distance is going up
    let distance = (0.5 * GRAVITY * time ** 2) / 2;
    // clear buffer
    acc_buffer.fill(GRAVITY);
    console.log(distance);
    return distance;
  }
  return -1;
};

const displayResult = (score, db) => {
  document.querySelector(".app").classList.add("score");
  document.querySelector("h1.score").innerText = score.toFixed(2);
  document.querySelector(
    ".end > h2.subtext"
  ).innerText = `The sky's the limit. ${SCHOOL_CONFIG.message}`;
  db.collection("tosses").add({
    distance: score.toFixed(2),
    school: SCHOOL_CONFIG.school_name,
    timestamp: Math.floor(new Date().getTime() / 1000),
  });
  document.querySelector(".tweet").innerHTML = "";
  twttr.widgets.createShareButton(
    "https://grad.naitian.org",
    document.querySelector(".tweet"),
    {
      text: `I just tossed my #GradCap ${score.toFixed(
        2
      )} meters. The sky is the limit! ${SCHOOL_CONFIG.hashtag}`,
    }
  );
};

window.onload = function () {
  console.log("v2");
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("school")) setSchool(urlParams.get("school"));
  else selectSchool();

  var firebaseConfig = {
    apiKey: "AIzaSyAxqvsJ_2ngh1roPCoXDPuvrUYj4cRWDBs",
    authDomain: "captoss.firebaseapp.com",
    databaseURL: "https://captoss.firebaseio.com",
    projectId: "captoss",
    storageBucket: "captoss.appspot.com",
    messagingSenderId: "716030117576",
    appId: "1:716030117576:web:4d8b8b93a76b43836607fd",
    measurementId: "G-KLMDZZZT7F",
  };
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  firebase.analytics();
  firebase.auth().signInAnonymously();

  firebase.auth().onAuthStateChanged(function (user) {
    console.log("YEET AUTHED");
  });
  const db = firebase.firestore();
  navigator.permissions
    .query({ name: "accelerometer" })
    .then(function (result) {
      if (result.state === "granted") {
        let acl = new Accelerometer({ frequency: QUERY_RATE });
        acl.start();
        console.log(acl);

        if (!acl.activated) {
          console.log("no accelerometer detected");
          document.querySelector(".subtext").innerText =
            "Your device doesn't support an accelerometer. Try viewing this on your phone instead?";
        }
        acl.addEventListener("activate", () => {
          document.querySelector(".subtext").innerText =
            "Gimme a toss. You earned it!";
        });
        acl.addEventListener("reading", () => {
          let read = magnitude(acl.x, acl.y, acl.z).toFixed(2);
          pushBuffer(read);
          let distance = detectThrowEnd();
          if (distance > 0) {
            displayResult(distance, db);
          }
        });
      } else if (result.state === "prompt") {
        console.log("prompt for permission");
      }
      // Don't do anything if the permission was denied.
    });
};
