// create Agora client
var client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

var localTracks = {
  videoTrack: null,
  audioTrack: null
};

var localTrackState = {
  videoTrackMuted: false,
  audioTrackMuted: false
}

var remoteUsers = {};
// Agora client options
var options = { 
  appid: null,
  channel: null,
  uid: null,
  token: null
};

let statsInterval;

// you can find all the agora preset video profiles here https://docs.agora.io/en/Voice/API%20Reference/web_ng/globals.html#videoencoderconfigurationpreset
var videoProfiles = [
  { label: "720p_竖屏", detail: "720×1080, 30fps, 2000Kbps", value: { width: 720, height: 1080, frameRate: 30 }  },          // custom video profile
  { label: "1080p_竖屏", detail: "1080×1920, 30fps, 3000Kbps", value: { width: 1080, height: 1920, frameRate: 30 }  }     // custom video profile
]

var curVideoProfile;

var mics = []; // all microphones devices you can use
var cams = []; // all cameras devices you can use
var currentMic; // the microphone you are using
var currentCam; // the camera you are using

let volumeAnimation;

// the demo can auto join channel with params in url
$(async () => {
  initVideoProfiles();
  $(".profile-list").delegate("a", "click", function(e){
    changeVideoProfile(this.getAttribute("label"));
  });

  $("#media-device-test").modal("show");
  $(".cam-list").delegate("a", "click", function(e){
    switchCamera(this.text);
  });
  $(".mic-list").delegate("a", "click", function(e){
    switchMicrophone(this.text);
  });

  var urlParams = new URL(location.href).searchParams;
  options.appid = urlParams.get("appid");
  options.channel = urlParams.get("channel");
  options.token = urlParams.get("token");
  options.uid = urlParams.get("uid");
  await mediaDeviceTest();
  volumeAnimation = requestAnimationFrame(setVolumeWave);

  if (options.appid && options.channel) {
    $("#uid").val(options.uid);
    $("#appid").val(options.appid);
    $("#token").val(options.token);
    $("#channel").val(options.channel);
    $("#join-form").submit();
  }
})

$("#join-form").submit(async function (e) {
  e.preventDefault();
  $("#join").attr("disabled", true);
  $("#device-wrapper").css("display", "flex");
  try {
    options.appid = $("#appid").val();
    options.token = $("#token").val();
    options.channel = $("#channel").val();
    options.uid = Number($("#uid").val());
    await join();
    if(options.token) {
      $("#success-alert-with-token").css("display", "block");
    } else {
      $("#success-alert a").attr("href", `index.html?appid=${options.appid}&channel=${options.channel}&token=${options.token}`);
      $("#success-alert").css("display", "block");
    }
  } catch (error) {
    console.error(error);
  } finally {
    $("#leave").attr("disabled", false);
  }
})

$("#leave").click(function (e) {
  leave();
})

$("#mute-audio").click(function (e) {
  if (!localTrackState.audioTrackMuted) {
    muteAudio();
  } else {
    unmuteAudio();
  }
});

$("#mute-video").click(function (e) {
  if (!localTrackState.videoTrackMuted) {
    muteVideo();
  } else {
    unmuteVideo();
  }
})

$("#media-device-test").on("hidden.bs.modal", function (e) {
  cancelAnimationFrame(volumeAnimation);
  if (options.appid && options.channel) {
    $("#appid").val(options.appid);
    $("#token").val(options.token);
    $("#channel").val(options.channel);
    $("#join-form").submit();
  }
})

async function join () {
  // add event listener to play remote tracks when remote user publishs.
  client.on("user-published", handleUserPublished);
  client.on("user-unpublished", handleUserUnpublished);
  
  // join a channel.
  options.uid = await client.join(options.appid, options.channel, options.token || null, options.uid || null);

  if (!localTracks.audioTrack || !localTracks.videoTrack) {
    [ localTracks.audioTrack, localTracks.videoTrack ] = await Promise.all([
      // create local tracks, using microphone and camera
      AgoraRTC.createMicrophoneAudioTrack({ microphoneId: currentMic.deviceId }),
      AgoraRTC.createCameraVideoTrack({ cameraId: currentCam.deviceId })
    ]);
  }

  showMuteButton();

  // play local video track
  localTracks.videoTrack.play("local-player");
  $("#local-player-name").text(`localVideo(${options.uid})`);

  // publish local tracks to channel
  await client.publish(Object.values(localTracks));
  console.log("publish success");

  initStats();
}

async function mediaDeviceTest() {
  // create local tracks
  [ localTracks.audioTrack, localTracks.videoTrack ] = await Promise.all([
    // create local tracks, using microphone and camera
    AgoraRTC.createMicrophoneAudioTrack(),
    AgoraRTC.createCameraVideoTrack()
  ]);

  // play local track on device detect dialog
  localTracks.videoTrack.play("pre-local-player");
  // localTracks.audioTrack.play();

  // get mics
  mics = await AgoraRTC.getMicrophones();
  currentMic = mics[0];
  $(".mic-input").val(currentMic.label);
  mics.forEach(mic => {
    $(".mic-list").append(`<a class="dropdown-item" href="#">${mic.label}</a>`);
  });

  // get cameras
  cams = await AgoraRTC.getCameras();
  currentCam = cams[0];
  $(".cam-input").val(currentCam.label);
  cams.forEach(cam => {
    $(".cam-list").append(`<a class="dropdown-item" href="#">${cam.label}</a>`);
  });
}


async function leave() {
  for (trackName in localTracks) {
    var track = localTracks[trackName];
    if(track) {
      track.stop();
      track.close();
      localTracks[trackName] = undefined;
    }
  }

  destructStats();

  // remove remote users and player views
  remoteUsers = {};
  $("#remote-playerlist").html("");

  // leave the channel
  await client.leave();

  $("#local-player-name").text("");
  $("#join").attr("disabled", false);
  $("#leave").attr("disabled", true);
  console.log("client leaves channel success");
}

async function subscribe(user, mediaType) {
  const uid = user.uid;
  // subscribe to a remote user
  await client.subscribe(user, mediaType);
  console.log("subscribe success");
  if (mediaType === 'video') {
    const player = $(`
      <div id="player-wrapper-${uid}">
        <p class="player-name">remoteUser(${uid})</p>
        <div id="player-${uid}" class="player"></div>
      </div>
    `);
    $("#remote-playerlist").append(player);
    user.videoTrack.play(`player-${uid}`);
  }
  if (mediaType === 'audio') {
    user.audioTrack.play();
  }
}

function initVideoProfiles () {
  videoProfiles.forEach(profile => {
    $(".profile-list").append(`<a class="dropdown-item" label="${profile.label}" href="#">${profile.label}: ${profile.detail}</a>`)
  });
  curVideoProfile = videoProfiles[0];
  $(".profile-input").val(`${curVideoProfile.detail}`);
}

async function changeVideoProfile (label) {
  curVideoProfile = videoProfiles.find(profile => profile.label === label);
  $(".profile-input").val(`${curVideoProfile.detail}`);
  // change the local video track`s encoder configuration
  localTracks.videoTrack && await localTracks.videoTrack.setEncoderConfiguration(curVideoProfile.value);
}

function handleUserPublished(user, mediaType) {
  const id = user.uid;
  remoteUsers[id] = user;
  subscribe(user, mediaType);
}

function handleUserUnpublished(user, mediaType) {
  if (mediaType === 'video') {
    const id = user.uid;
    delete remoteUsers[id];
    $(`#player-wrapper-${id}`).remove();
  }
}

async function switchCamera(label) {
  currentCam = cams.find(cam => cam.label === label);
  $(".cam-input").val(currentCam.label);
  // switch device of local video track.
  await localTracks.videoTrack.setDevice(currentCam.deviceId);
}

async function switchMicrophone(label) {
  currentMic = mics.find(mic => mic.label === label);
  $(".mic-input").val(currentMic.label);
  // switch device of local audio track.
  await localTracks.audioTrack.setDevice(currentMic.deviceId);
}

// show real-time volume while adjusting device. 
function setVolumeWave() {
  volumeAnimation = requestAnimationFrame(setVolumeWave);
  $(".progress-bar").css("width", localTracks.audioTrack.getVolumeLevel() * 100 + "%")
  $(".progress-bar").attr("aria-valuenow", localTracks.audioTrack.getVolumeLevel() * 100)
}



function hideMuteButton() {
  $("#mute-video").css("display", "none");
  $("#mute-audio").css("display", "none");
}

function showMuteButton() {
  $("#mute-video").css("display", "inline-block");
  $("#mute-audio").css("display", "inline-block");
}

async function muteAudio() {
  if (!localTracks.audioTrack) return;
  /**
   * After calling setMuted to mute an audio or video track, the SDK stops sending the audio or video stream. Users whose tracks are muted are not counted as users sending streams.
   * Calling setEnabled to disable a track, the SDK stops audio or video capture
   */
  await localTracks.audioTrack.setMuted(true);
  localTrackState.audioTrackMuted = true;
  $("#mute-audio").text("取消静音");
}

async function muteVideo() {
  if (!localTracks.videoTrack) return;
  await localTracks.videoTrack.setMuted(true);
  localTrackState.videoTrackMuted = true;
  $("#mute-video").text("打开摄像头");
}

async function unmuteAudio() {
  if (!localTracks.audioTrack) return;
  await localTracks.audioTrack.setMuted(false);
  localTrackState.audioTrackMuted = false;
  $("#mute-audio").text("静音");
}

async function unmuteVideo() {
  if (!localTracks.videoTrack) return;
  await localTracks.videoTrack.setMuted(false);
  localTrackState.videoTrackMuted = false;
  $("#mute-video").text("关闭摄像头");
}


// start collect and show stats information
function initStats() {
  statsInterval = setInterval(flushStats, 1000);
}

// stop collect and show stats information
function destructStats() {
  clearInterval(statsInterval);
  $("#session-stats").html("");
  $("#transport-stats").html("");
  $("#local-stats").html("");
}

// flush stats views
function flushStats() {
  // get the client stats message
  const clientStats = client.getRTCStats();
  const clientStatsList = [
    { description: "频道中的用户数", value: clientStats.UserCount, unit: "" },
    { description: "频道持续时间", value: clientStats.Duration, unit: "s" },
  ]
  $("#client-stats").html(`
    ${clientStatsList.map(stat => `<p class="stats-row">${stat.description}: ${stat.value} ${stat.unit}</p>`).join("")}
  `)

  // get the local track stats message
  const localStats = { video: client.getLocalVideoStats(), audio: client.getLocalAudioStats() };
  const localStatsList = [
    { description: "Send audio bit rate", value: localStats.audio.sendBitrate, unit: "bps" },
    { description: "Total audio bytes sent", value: localStats.audio.sendBytes, unit: "bytes" },
    { description: "Total audio packets sent", value: localStats.audio.sendPackets, unit: "" },
    { description: "Total audio packets loss", value: localStats.audio.sendPacketsLost, unit: "" },
    { description: "Video capture resolution height", value: localStats.video.captureResolutionHeight, unit: "" },
    { description: "Video capture resolution width", value: localStats.video.captureResolutionWidth, unit: "" },
    { description: "Video send resolution height", value: localStats.video.sendResolutionHeight, unit: "" },
    { description: "Video send resolution width", value: localStats.video.sendResolutionWidth, unit: "" },
    { description: "video encode delay", value: Number(localStats.video.encodeDelay).toFixed(2), unit: "ms" },
    { description: "Send video bit rate", value: localStats.video.sendBitrate, unit: "bps" },
    { description: "Total video bytes sent", value: localStats.video.sendBytes, unit: "bytes" },
    { description: "Total video packets sent", value: localStats.video.sendPackets, unit: "" },
    { description: "Total video packets loss", value: localStats.video.sendPacketsLost, unit: "" },
    { description: "Video duration", value: localStats.video.totalDuration, unit: "s" },
    { description: "Total video freeze time", value: localStats.video.totalFreezeTime, unit: "s" },
  ];
  $("#local-stats").html(`
    ${localStatsList.map(stat => `<p class="stats-row">${stat.description}: ${stat.value} ${stat.unit}</p>`).join("")}
  `);
  
  Object.keys(remoteUsers).forEach(uid => {
    // get the remote track stats message
    const remoteTracksStats = { video: client.getRemoteVideoStats()[uid], audio: client.getRemoteAudioStats()[uid] };
    const remoteTracksStatsList = [
      { description: "Delay of audio from sending to receiving", value: Number(remoteTracksStats.audio.receiveDelay).toFixed(2), unit: "ms" },
      { description: "Delay of video from sending to receiving", value: Number(remoteTracksStats.video.receiveDelay).toFixed(2), unit: "ms" },
      { description: "Total audio bytes received", value: remoteTracksStats.audio.receiveBytes, unit: "bytes" },
      { description: "Total audio packets received", value: remoteTracksStats.audio.receivePackets, unit: "" },
      { description: "Total audio packets loss", value: remoteTracksStats.audio.receivePacketsLost, unit: "" },
      { description: "Total audio packets loss rate", value: Number(remoteTracksStats.audio.packetLossRate).toFixed(3), unit: "%" },
      { description: "Video received resolution height", value: remoteTracksStats.video.receiveResolutionHeight, unit: "" },
      { description: "Video received resolution width", value: remoteTracksStats.video.receiveResolutionWidth, unit: "" },
      { description: "Receiving video bit rate", value: remoteTracksStats.video.receiveBitrate, unit: "bps" },
      { description: "Total video bytes received", value: remoteTracksStats.video.receiveBytes, unit: "bytes" },
      { description: "Total video packets received", value: remoteTracksStats.video.receivePackets, unit: "" },
      { description: "Total video packets loss", value: remoteTracksStats.video.receivePacketsLost, unit: "" },
      { description: "Total video packets loss rate", value: Number(remoteTracksStats.video.receivePacketsLost).toFixed(3), unit: "%" },
      { description: "Video duration", value: remoteTracksStats.video.totalDuration, unit: "s" },
      { description: "Total video freeze time", value: remoteTracksStats.video.totalFreezeTime, unit: "s" },
      { description: "video freeze rate", value: Number(remoteTracksStats.video.freezeRate).toFixed(3), unit: "%" },
    ];
    $(`#player-wrapper-${uid} .track-stats`).html(`
      ${remoteTracksStatsList.map(stat => `<p class="stats-row">${stat.description}: ${stat.value} ${stat.unit}</p>`).join("")}
    `);
  });
}