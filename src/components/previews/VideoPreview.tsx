import type { OdFileObject } from '../../types'
import { FC, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import axios from 'axios'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'
import { useAsync } from 'react-async-hook'
import { useClipboard } from 'use-clipboard-copy'

import { getBaseUrl } from '../../utils/getBaseUrl'
import { getExtension } from '../../utils/getFileIcon'
import { getStoredToken } from '../../utils/protectedRouteHandler'

import { DownloadButton } from '../DownloadBtnGtoup'
import { DownloadBtnContainer, PreviewContainer } from './Containers'
import FourOhFour from '../FourOhFour'
import Loading from '../Loading'
import CustomEmbedLinkMenu from '../CustomEmbedLinkMenu'

// Solution 1: Import CSS directly from plyr package (recommended)
import 'plyr/dist/plyr.css'

// Alternative Solution 2: Dynamic import if needed
// dynamic(() => import('plyr/dist/plyr.css'), { ssr: false })

// Dynamically import Plyr with SSR disabled
const Plyr = dynamic(() => import('plyr-react'), {
  ssr: false,
  loading: () => <Loading loadingText="Loading player..." />,
})

const VideoPlayer: FC<{
  videoName: string
  videoUrl: string
  width?: number
  height?: number
  thumbnail: string
  subtitle: string
  isFlv: boolean
  mpegts: any
}> = ({ videoName, videoUrl, width, height, thumbnail, subtitle, isFlv, mpegts }) => {
  useEffect(() => {
    const loadSubtitles = async () => {
      try {
        const resp = await axios.get(subtitle, { responseType: 'blob' })
        const track = document.querySelector('track')
        track?.setAttribute('src', URL.createObjectURL(resp.data))
      } catch (error) {
        console.log('Could not load subtitle.')
      }
    }

    const loadFlvPlayer = () => {
      if (isFlv && mpegts) {
        const video = document.getElementById('plyr')
        if (video) {
          const flv = mpegts.createPlayer({ url: videoUrl, type: 'flv' })
          flv.attachMediaElement(video)
          flv.load()
        }
      }
    }

    loadSubtitles()
    loadFlvPlayer()
  }, [videoUrl, isFlv, mpegts, subtitle])

  // Properly typed Plyr source object
  const plyrSource = {
    type: 'video' as const,
    title: videoName,
    poster: thumbnail,
    tracks: [{ kind: 'captions' as const, label: videoName, src: '', default: true }],
    sources: isFlv ? [] : [{ src: videoUrl, type: 'video/mp4' }]
  }

  const plyrOptions = {
    ratio: `${width ?? 16}:${height ?? 9}`,
    fullscreen: { iosNative: true }
  }

  return <Plyr id="plyr" source={plyrSource} options={plyrOptions} />
}

// Rest of your VideoPreview component remains exactly the same
const VideoPreview: FC<{ file: OdFileObject }> = ({ file }) => {
  const { asPath } = useRouter()
  const hashedToken = getStoredToken(asPath)
  const clipboard = useClipboard()
  const [menuOpen, setMenuOpen] = useState(false)
  const { t } = useTranslation()

  const thumbnail = `/api/thumbnail/?path=${asPath}&size=large${hashedToken ? `&odpt=${hashedToken}` : ''}`
  const vtt = `${asPath.substring(0, asPath.lastIndexOf('.'))}.vtt`
  const subtitle = `/api/raw/?path=${vtt}${hashedToken ? `&odpt=${hashedToken}` : ''}`
  const videoUrl = `/api/raw/?path=${asPath}${hashedToken ? `&odpt=${hashedToken}` : ''}`
  const isFlv = getExtension(file.name) === 'flv'

  const { loading, error, result: mpegts } = useAsync(async () => {
    if (isFlv) return (await import('mpegts.js')).default
  }, [isFlv])

  return (
    <>
      <CustomEmbedLinkMenu path={asPath} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <PreviewContainer>
        {error ? (
          <FourOhFour errorMsg={error.message} />
        ) : loading && isFlv ? (
          <Loading loadingText={t('Loading FLV extension...')} />
        ) : (
          <VideoPlayer
            videoName={file.name}
            videoUrl={videoUrl}
            width={file.video?.width}
            height={file.video?.height}
            thumbnail={thumbnail}
            subtitle={subtitle}
            isFlv={isFlv}
            mpegts={mpegts}
          />
        )}
      </PreviewContainer>

      <DownloadBtnContainer>
        <div className="flex flex-wrap justify-center gap-2">
          <DownloadButton
            onClickCallback={() => window.open(videoUrl)}
            btnColor="blue"
            btnText={t('Download')}
            btnIcon="file-download"
          />
          <DownloadButton
            onClickCallback={() => {
              clipboard.copy(`${getBaseUrl()}/api/raw/?path=${asPath}${hashedToken ? `&odpt=${hashedToken}` : ''}`)
              toast.success(t('Copied direct link to clipboard.'))
            }}
            btnColor="pink"
            btnText={t('Copy direct link')}
            btnIcon="copy"
          />
          <DownloadButton
            onClickCallback={() => setMenuOpen(true)}
            btnColor="teal"
            btnText={t('Customise link')}
            btnIcon="pen"
          />
          <DownloadButton
            onClickCallback={() => window.open(`iina://weblink?url=${getBaseUrl()}${videoUrl}`)}
            btnText="IINA"
            btnImage="/players/iina.png"
          />
          <DownloadButton
            onClickCallback={() => window.open(`vlc://${getBaseUrl()}${videoUrl}`)}
            btnText="VLC"
            btnImage="/players/vlc.png"
          />
          <DownloadButton
            onClickCallback={() => window.open(`potplayer://${getBaseUrl()}${videoUrl}`)}
            btnText="PotPlayer"
            btnImage="/players/potplayer.png"
          />
          <DownloadButton
            onClickCallback={() => window.open(`nplayer-http://${window?.location.hostname ?? ''}${videoUrl}`)}
            btnText="nPlayer"
            btnImage="/players/nplayer.png"
          />
        </div>
      </DownloadBtnContainer>
    </>
  )
}

export default VideoPreview
