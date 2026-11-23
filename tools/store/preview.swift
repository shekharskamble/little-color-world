// App Store app preview converter (iPad 13": 1600 x 1200, H.264, constant 30 fps, silent stereo AAC 256 kbps).
//   preview info   <in.mp4>
//   preview frames <in.mp4> <out dir> <every seconds>       stills as PNG, landscape
//   preview make   <in.mp4> <out.mp4> <start s> <end s> [music.wav|-] [still.png from s to s]
//     music from tools/store/music.py (else silence). The still (a screenshot of the same screen, landscape) covers a
//     stretch where the simulator stopped redrawing mid-animation; it fades in over 0.3 s, so the screen looks as the
//     app really draws it.
import AVFoundation
import CoreImage
import Foundation
import ImageIO
import UniformTypeIdentifiers

let W = 1600, H = 1200, FPS: Int32 = 30
let args = CommandLine.arguments
let asset = AVURLAsset(url: URL(fileURLWithPath: args[2]))
let track = asset.tracks(withMediaType: .video)[0]
let duration = CMTimeGetSeconds(asset.duration)
let ci = CIContext()

/// The recording is the iPad's native portrait frame; the app is in landscape, so turn it a quarter clockwise.
func landscape(_ img: CIImage) -> CIImage {
  var out = img.transformed(by: track.preferredTransform)
  if out.extent.height > out.extent.width { out = out.oriented(.right) }
  return out.transformed(by: CGAffineTransform(translationX: -out.extent.minX, y: -out.extent.minY))
}

func fitted(_ img: CIImage) -> CIImage {
  let l = landscape(img)
  let s = CGAffineTransform(scaleX: CGFloat(W) / l.extent.width, y: CGFloat(H) / l.extent.height)
  return l.transformed(by: s)
}

/// Reads frames in order and returns the latest frame at or before each requested time.
final class Frames {
  let reader: AVAssetReader
  let out: AVAssetReaderTrackOutput
  var current: CMSampleBuffer?
  var next: CMSampleBuffer?
  init() {
    reader = try! AVAssetReader(asset: asset)
    out = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
    reader.add(out)
    reader.startReading()
    current = out.copyNextSampleBuffer()
    next = out.copyNextSampleBuffer()
  }
  func at(_ t: Double) -> CIImage {
    while let n = next, CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(n)) <= t {
      current = n
      next = out.copyNextSampleBuffer()
    }
    return CIImage(cvPixelBuffer: CMSampleBufferGetImageBuffer(current!)!)
  }
}

func writePNG(_ img: CIImage, _ path: String) {
  let cg = ci.createCGImage(img, from: img.extent)!
  let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: path) as CFURL, UTType.png.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(dest, cg, nil)
  CGImageDestinationFinalize(dest)
}

func silence(at t: Double, frames: Int, format: CMAudioFormatDescription) -> CMSampleBuffer {
  let bytes = frames * 2 * 2
  var block: CMBlockBuffer?
  CMBlockBufferCreateWithMemoryBlock(allocator: nil, memoryBlock: nil, blockLength: bytes, blockAllocator: nil, customBlockSource: nil,
                                     offsetToData: 0, dataLength: bytes, flags: kCMBlockBufferAssureMemoryNowFlag, blockBufferOut: &block)
  CMBlockBufferFillDataBytes(with: 0, blockBuffer: block!, offsetIntoDestination: 0, dataLength: bytes)
  var sb: CMSampleBuffer?
  CMAudioSampleBufferCreateReadyWithPacketDescriptions(allocator: nil, dataBuffer: block!, formatDescription: format, sampleCount: frames,
                                                       presentationTimeStamp: CMTime(seconds: t, preferredTimescale: 48000),
                                                       packetDescriptions: nil, sampleBufferOut: &sb)
  return sb!
}

switch args[1] {
case "info":
  print(String(format: "duration %.2f s, size %@, transform %@", duration, "\(track.naturalSize)", "\(track.preferredTransform)"))
case "frames":
  let dir = args[3], every = Double(args[4])!
  let f = Frames()
  var t = 0.0
  while t < duration {
    writePNG(fitted(f.at(t)), String(format: "%@/f%05.1f.png", dir, t))
    t += every
  }
case "make":
  let start = Double(args[4])!, end = min(Double(args[5])!, duration)
  let url = URL(fileURLWithPath: args[3])
  try? FileManager.default.removeItem(at: url)
  let writer = try! AVAssetWriter(outputURL: url, fileType: .mp4)
  let vIn = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: W, AVVideoHeightKey: H,
    AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 12_000_000, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
                                      AVVideoExpectedSourceFrameRateKey: FPS, AVVideoMaxKeyFrameIntervalKey: FPS],
  ])
  let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: vIn, sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H,
  ])
  let aIn = AVAssetWriterInput(mediaType: .audio, outputSettings: [
    AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: 48000, AVNumberOfChannelsKey: 2, AVEncoderBitRateKey: 256_000,
  ])
  vIn.expectsMediaDataInRealTime = false
  aIn.expectsMediaDataInRealTime = false
  writer.add(vIn)
  writer.add(aIn)
  writer.startWriting()
  writer.startSession(atSourceTime: .zero)
  var asbd = AudioStreamBasicDescription(mSampleRate: 48000, mFormatID: kAudioFormatLinearPCM,
                                         mFormatFlags: kAudioFormatFlagIsSignedInteger | kAudioFormatFlagIsPacked,
                                         mBytesPerPacket: 4, mFramesPerPacket: 1, mBytesPerFrame: 4, mChannelsPerFrame: 2, mBitsPerChannel: 16, mReserved: 0)
  var afmt: CMAudioFormatDescription?
  CMAudioFormatDescriptionCreate(allocator: nil, asbd: &asbd, layoutSize: 0, layout: nil, magicCookieSize: 0, magicCookie: nil, extensions: nil, formatDescriptionOut: &afmt)
  let f = Frames()
  let total = Int((end - start) * Double(FPS))
  var still: (image: CIImage, from: Double, to: Double)?
  if args.count > 9 {
    let img = CIImage(contentsOf: URL(fileURLWithPath: args[7]))!
    let fit = img.transformed(by: CGAffineTransform(scaleX: CGFloat(W) / img.extent.width, y: CGFloat(H) / img.extent.height))
    still = (fit, Double(args[8])!, Double(args[9])!)
  }
  /// The frame at source time t: the recording, or the still faded over it inside the still's stretch.
  func frame(_ t: Double) -> CIImage {
    let rec = fitted(f.at(t))
    guard let s = still, t >= s.from, t < s.to else { return rec }
    let a = min(1, (t - s.from) / 0.3)
    let faded = s.image.applyingFilter("CIColorMatrix", parameters: ["inputAVector": CIVector(x: 0, y: 0, z: 0, w: a)])
    return faded.composited(over: rec)
  }
  let group = DispatchGroup()
  // Each input pulls its own data when ready, so neither waits on the other (one shared loop deadlocked).
  var i = 0
  group.enter()
  vIn.requestMediaDataWhenReady(on: DispatchQueue(label: "video")) {
    while vIn.isReadyForMoreMediaData {
      if i >= total {
        vIn.markAsFinished()
        group.leave()
        return
      }
      var pb: CVPixelBuffer?
      CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb)
      ci.render(frame(start + Double(i) / Double(FPS)), to: pb!)
      adaptor.append(pb!, withPresentationTime: CMTime(value: CMTimeValue(i), timescale: FPS))
      i += 1
    }
  }
  var audioT = 0.0
  let length = Double(total) / Double(FPS)
  // Music, when given: its PCM samples are encoded to AAC by the writer, trimmed to the video's length.
  var music: AVAssetReaderTrackOutput?
  if args.count > 6, args[6] != "-" {
    let m = AVURLAsset(url: URL(fileURLWithPath: args[6]))
    let r = try! AVAssetReader(asset: m)
    r.timeRange = CMTimeRange(start: .zero, duration: CMTime(seconds: length, preferredTimescale: 48000))
    let o = AVAssetReaderTrackOutput(track: m.tracks(withMediaType: .audio)[0], outputSettings: [
      AVFormatIDKey: kAudioFormatLinearPCM, AVLinearPCMBitDepthKey: 16, AVLinearPCMIsFloatKey: false,
      AVLinearPCMIsBigEndianKey: false, AVLinearPCMIsNonInterleaved: false, AVSampleRateKey: 48000, AVNumberOfChannelsKey: 2,
    ])
    r.add(o)
    r.startReading()
    music = o
  }
  group.enter()
  aIn.requestMediaDataWhenReady(on: DispatchQueue(label: "audio")) {
    while aIn.isReadyForMoreMediaData {
      if let o = music {
        if let sb = o.copyNextSampleBuffer() { aIn.append(sb); continue }
        aIn.markAsFinished()
        group.leave()
        return
      }
      if audioT >= length {
        aIn.markAsFinished()
        group.leave()
        return
      }
      aIn.append(silence(at: audioT, frames: 1024, format: afmt!))
      audioT += 1024.0 / 48000.0
    }
  }
  group.wait()
  let done = DispatchSemaphore(value: 0)
  writer.finishWriting { done.signal() }
  done.wait()
  print(writer.status == .completed ? "wrote \(args[3]): \(String(format: "%.2f", end - start)) s" : "failed: \(String(describing: writer.error))")
default:
  print("usage: preview info|frames|make …")
}
