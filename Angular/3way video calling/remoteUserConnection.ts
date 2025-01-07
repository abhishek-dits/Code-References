import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { UID } from 'agora-rtc-sdk-ng';
import { Unsubscriber } from '../../../core/utils/unsubscriber';
import { ControlsService } from '../../services/controls/controls.service';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CommonHttpService } from '../../../core/services/common-http.service';
import { CommonService } from '../../../core/services/storage/common.service';
import { AgoraService } from '../../services/agora/agora.service';
import { MToasterService } from '../../services/toaster/toaster.service';
import { SharedModule } from '../../shared.module';
import { PreviewScreenshotComponent } from '../preview-screenshot/preview-screenshot.component';

@Component({
  selector: 'm-app-remote-user',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './remote-user.component.html',
  styleUrl: './remote-user.component.scss'
})
export class RemoteUserComponent extends Unsubscriber implements OnInit, AfterViewInit {
  @Input() uid!: UID;
  @Input() aptId!: string;
  @ViewChild('downloadScreenShot') downloadScreenShot!: ElementRef;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLElement>;
  ctxCanvas: any;
  // remoteVideo:any;
  holistic: any;
  recordedBlobs!: Blob[];
  showSpinner: boolean = false;
  streamData: any;
  isRemoteUserMute: boolean = false;
  @Input() onReady?: (element: HTMLElement) => void;
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  showDummyImage: boolean = false;
  ref: DynamicDialogRef | undefined;
  remoteUserData: any = {};
  nameInitials: string = '';

  constructor(private elementRef: ElementRef, private _controlsService: ControlsService, public _agoraService: AgoraService,
    private _dialog: DialogService, private _http: CommonHttpService, private _toaster: MToasterService, private _commonService: CommonService
  ) {
    super();

    this.subscription.add(this._agoraService.isUserVideoMute$.subscribe((data: any) => {
      if (data.uid == this.uid) {
        this.showDummyImage = true
      }
    }))
  }

  ngOnInit(): void {
    const parentElement = this.elementRef.nativeElement.parentElement;
    const aptIdElement = parentElement.querySelector('aptId');
    if (aptIdElement) {
      this.aptId = aptIdElement.dataset.aptId;
    }
    console.log(`Remote user component initialized for UID: ${this.uid}`)
  }

  ngAfterViewInit(): void {
    if (this.onReady) {
      this.onReady(this.remoteVideo.nativeElement)
      this.fetchRemoteUserData()
    }
  }

  mediaRecorder: any;
  downloadUrl!: string;
  recordingTimeout: any;
  startTime: Date | null = null;
  startRecording() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        const videoElement: any = document.createElement('video');
        videoElement.setAttribute('autoplay', '');
        videoElement.setAttribute('playsinline', '');
        videoElement.style.width = '100%'; // Adjust as needed
        videoElement.srcObject = stream;
        this.remoteVideo.nativeElement.appendChild(videoElement);

        this.mediaRecorder = new MediaRecorder(stream);
        this.recordedBlobs = [];
        this.mediaRecorder.ondataavailable = (event: any) => {
          if (event.data && event.data.size > 0) {
            this.recordedBlobs.push(event.data);
            console.log("----")
          }
        };
        this.mediaRecorder.onstop = () => {
          const videoBuffer = new Blob(this.recordedBlobs, { type: 'video/webm' });
          this.downloadUrl = window.URL.createObjectURL(videoBuffer);
          console.log("THIS>DOWNLOADURL", this.downloadUrl)
        };

        this.startTime = new Date();
        this.mediaRecorder.start();

        this.recordingTimeout = setTimeout(() => {
          const currentTime = new Date();
          const elapsedSeconds = (currentTime.getTime() - this.startTime!.getTime()) / 1000;
          console.log(elapsedSeconds)
          if (elapsedSeconds >= 10 && elapsedSeconds == 13) {
            console.log('Recording reached at least 15 seconds.');
          }

          if (elapsedSeconds == 20) {
            this.stopRecording();


          }
        }, 20000); // 10 seconds in milliseconds
      })
      .catch((error) => {
        console.error('getUserMedia error:', error);

      })
  }

  stopRecording() {
    this.mediaRecorder.stop();
    clearTimeout(this.recordingTimeout);

    this.ref = this._dialog.open(PreviewScreenshotComponent, {
      data: { imageData: '', type: 'recording' },
      header: 'Screenshot',
      width: '500px',
      styleClass: 'm-book-appointment-dialog',
      modal: true,
      closable: true
    });
  }

  fetchRemoteUserData() {
    let agoraData = JSON.parse(localStorage.getItem('agoraData') as any)
    if (this.uid == agoraData?.doctor?.dr_id) this.remoteUserData = agoraData.doctor;
    else if (this.uid == agoraData?.patient.patient_id) this.remoteUserData = agoraData.patient;
    else this.remoteUserData = agoraData.admin;
    this.nameInitials = this._commonService.getInitials(this.remoteUserData?.user_name);
  }

  get nativeElement(): HTMLElement {
    return this.elementRef.nativeElement;
  }

  get remoteVideoDivId(): string {
    return this.remoteVideo.nativeElement.id
  }
}

