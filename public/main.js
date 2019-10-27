let Peer = require('simple-peer')
let socket = io()
const video = document.querySelector('#ownVideo')
const canvas = document.querySelector("#ownCanvas");
let client = {}

function StreamToCanvas() {
  const ctx = canvas.getContext("2d");

  video.addEventListener('play', () => {
    console.log('playing')
    function step() {
      console.log('drawing')
      ctx.filter = 'grayscale()'
      ctx.drawImage(video, -100, -100, canvas.width + 200, canvas.height + 200)
      requestAnimationFrame(step)
    }
    requestAnimationFrame(step);
  })
}
StreamToCanvas()

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    socket.emit('NewClient')
    video.srcObject = stream
    video.play()

    function InitPeer(type) {
      let peer = new Peer({
        initiator: type === 'init',
        stream: canvas.captureStream(),
        trickle: false
      })
      peer.on('stream', stream => {
        CreateVideo(stream)
      })
      peer.on('close', () => {
        document.getElementById('peerVideo').remove()
        peer.destroy()
      })
      return peer
    }

    function MakePeer() {
      client.gotAnswer = false
      let peer = InitPeer('init')
      peer.on('signal', data => {
        if (!client.gotAnswer) {
          socket.emit('Offer', data)
        }
      })
      client.peer = peer
    }

    function FrontAnswer(offer) {
      let peer = InitPeer('notInit')
      peer.on('signal', data => {
        socket.emit('Answer', data)
      })
      peer.signal(offer)
    }

    function SignalAnswer(answer) {
      client.gotAnswer = true
      let peer = client.peer
      peer.signal(answer)
    }

    function CreateVideo(stream) {
      let video = document.createElement('video')
      video.id = 'peerVideo'
      video.srcObject = stream
      video.class = 'embed-responsive-item'
      document.querySelector('#peerDiv').appendChild(video)
      video.play()
    }

    function SessionActive() {
      document.write('Session Active. Please come back later!')
    }

    socket.on('BackOffer', FrontAnswer)
    socket.on('BackAnswer', SignalAnswer)
    socket.on('SessionActive', SessionActive)
    socket.on('CreatePeer', MakePeer)
  })
  .catch(e => document.write(e))

