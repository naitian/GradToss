import * as d3 from "d3";

const magnitude = (x, y, z) => {
  return Math.sqrt(x ** 2 + y ** 2 + z ** 2);
};

const QUERY_RATE = 60; // times per second
const BUFFER_TIME = 5; // seconds
const ZERO_G_THRESH = 0.8; // meters per second squared
const GRAVITY = 9.81; // meters per second squared

const acc_buffer = Array.from(Array(QUERY_RATE * BUFFER_TIME));
acc_buffer.fill(GRAVITY);

const pushBuffer = (magnitude) => {
  acc_buffer.shift();
  acc_buffer.push(magnitude);
};

const detectThrowEnd = () => {
  if (
    d3.mean(acc_buffer.slice(-10, -5)) < ZERO_G_THRESH &&
    d3.mean(acc_buffer.slice(-5)) > ZERO_G_THRESH
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
    console.log(time);
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

const displayResult = (score) => {
  document.querySelector(".app").classList.add("score");
  document.querySelector("h1.score").innerText = score.toFixed(2);
  document.querySelector(".tweet").innerHTML = "";
  twttr.widgets.createShareButton("https://grad.naitian.org", document.querySelector(".tweet"), {
    text: `I just tossed my #GradCap ${score.toFixed(2)} meters. The sky is the limit! #MGoGrad`,
  });
};

window.onload = function () {
  console.log("hi");
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
            // output.innerText = `${distance.toFixed(2)} meters`;
            displayResult(distance);
          }
        });
      } else if (result.state === "prompt") {
        console.log("prompt for permission");
      }
      // Don't do anything if the permission was denied.
    });
};
