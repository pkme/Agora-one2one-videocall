<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>视频通话</title>
  <link rel="stylesheet" href="./vendor/bootstrap.min.css">
  <link rel="stylesheet" href="./index.css">
</head>
<body>

<?php
include("./RtcTokenBuilder.php");

$appID = "替换为自己的";
$appCertificate = "替换为自己的";
$channelName = "替换为自己的";
$uid = 0;
$uidStr = "0";
$role = RtcTokenBuilder::RoleAttendee;
$expireTimeInSeconds = 36000;
$currentTimestamp = (new DateTime("now", new DateTimeZone('UTC')))->getTimestamp();
$privilegeExpiredTs = $currentTimestamp + $expireTimeInSeconds;

$token = RtcTokenBuilder::buildTokenWithUid($appID, $appCertificate, $channelName, $uid, $role, $privilegeExpiredTs);
?>


  <div class="container-fluid banner">
    <p class="banner-text">凤东-视频通话频道</p>
  </div>

  <div id="success-alert" class="alert alert-success alert-dismissible fade show" role="alert">
    <strong>恭喜!</strong><span> 你可以点击按钮邀请其他人加入 </span><a href="" target="_blank">here</a>
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
  <div id="success-alert-with-token" class="alert alert-success alert-dismissible fade show" role="alert">
    <strong>恭喜!</strong><span> 成功加入频道. </span>
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
  <div id="success-alert-with-token" class="alert alert-success alert-dismissible fade show" role="alert">
    <strong>恭喜!</strong><span> 成功加入频道. </span>
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
  
  <div class="container">
    <form id="join-form">
      <div class="row join-info-group">
          <div class="col-sm">
            <input id="appid" type="hidden" value="<?php echo $appID; ?>">
           </div>
          <div class="col-sm">
            <input id="token" type="hidden" value="<?php echo $token; ?>" >
          </div>
          <div class="col-sm">
            <input id="channel" type="hidden" value="<?php echo $channelName; ?>">
          </div>
      </div>

      <div class="input-group mb-3">
        <div class="input-group-prepend">
          <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">视频大小配置</button>
          <div class="profile-list dropdown-menu"></div>
        </div>
        <input type="text" class="profile-input form-control" aria-label="Text input with dropdown button" readonly>
      </div>

      <div class="button-group">
        <button id="join" type="submit" class="btn btn-primary btn-sm">加入</button>
        <button id="leave" type="button" class="btn btn-primary btn-sm" disabled>离开</button>
        <button id="mute-audio" type="button" class="btn btn-primary btn-sm">静音</button>
        <button id="mute-video" type="button" class="btn btn-primary btn-sm">关闭摄像头</button>
      </div>
    </form>

    <div id="device-wrapper">
      <div class="input-group">
        <div class="input-group-prepend">
          <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">麦克风选择</button>
          <div class="mic-list dropdown-menu"></div>
        </div>
        <input type="text" class="mic-input form-control" aria-label="Text input with dropdown button" readonly>
      </div>
  
      <div class="input-group">
        <div class="input-group-prepend">
          <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">摄像头选择</button>
          <div class="cam-list dropdown-menu"></div>
        </div>
        <input type="text" class="cam-input form-control" aria-label="Text input with dropdown button" readonly>
      </div>
    </div>

    <div id="client-stats" class="stats"></div>

    <div class="row video-group">
      <div class="col">
        <p id="local-player-name" class="player-name"></p>
        <div id="local-player" class="player"></div>
      </div>
      <div class="w-100"></div>
      <div class="col">
        <div id="remote-playerlist"></div>
      </div>
    </div>
  </div>


  <!-- Modal -->
  <div class="modal fade" id="media-device-test" data-backdrop="static" tabindex="-1" role="dialog" aria-labelledby="staticBackdropLabel" aria-hidden="true">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="modal-label">媒体设备测试</h5>
        </div>
        <div class="modal-body">
          <div class="container">
            <h5 class="device-name">麦克风</h5>
            <p id="device-intro">发出声音检查麦克风是否工作.</p>
            <div class="input-group mb-3">
              <div class="input-group-prepend">
                <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">麦克风选择</button>
                <div class="mic-list dropdown-menu"></div>
              </div>
              <input type="text" class="mic-input form-control" aria-label="Text input with dropdown button" readonly>
            </div>
            <div class="progress">
              <div class="progress-bar bg-success" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
            <h5 class="device-name">摄像头</h5>
            <p id="device-intro">移动到摄像机前面，检查它是否工作.</p>
            <div class="input-group mb-3">
              <div class="input-group-prepend">
                <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">摄像头</button>
                <div class="cam-list dropdown-menu"></div>
              </div>
              <input type="text" class="cam-input form-control" aria-label="Text input with dropdown button" readonly>
            </div>
            <div id="pre-local-player" class="player"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" data-dismiss="modal">Finish</button>
        </div>
      </div>
    </div>
  </div>


  <script src="./vendor/jquery-3.4.1.min.js"></script>
  <script src="./vendor/bootstrap.bundle.min.js"></script>
  <script src="./AgoraRTC_N-4.7.3.js"></script>
  <script src="./index.js"></script>
</body>
</html>