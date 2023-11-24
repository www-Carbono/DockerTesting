import { TEMP_FOLDER, UPLOADS_FOLDER, PORT, FILE_EXTENSION } from './constants'
import express from 'express'
import ytdl from 'ytdl-core'
import fs from 'fs'
import { spawn } from 'child_process'
import crypto from 'crypto'
import cors from 'cors'
import ytsr from 'ytsr'
import findRemoveSync from 'find-remove'
import path from 'path'

// Configuration:
const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Borrado de Archivos cada hora:
setInterval(() => {
  findRemoveSync(path.join(UPLOADS_FOLDER), { age: { seconds: 3600 }, files: '*.*' })
}, 1800)

app.post('/convertSong', (req, res) => {
  const URL = req.body.link
  const tempo = req.body.tempo
  const pitch = req.body.pitch
  const SongName: string[] = []

  let randomName: string = ''
  randomName = crypto.randomBytes(20).toString('hex')
  try {
    downloadVideo(URL, randomName, SongName)
      .then(() => {
        setTimeout(() => {
          const PATH_TEMP = path.join(TEMP_FOLDER, randomName)
          const PATH_OUTPUT = path.join(UPLOADS_FOLDER, randomName)

          const command = `ffmpeg -i ${PATH_TEMP}${FILE_EXTENSION} -af asetrate=44100*${pitch},aresample=44100,atempo=${tempo} ${PATH_OUTPUT}${FILE_EXTENSION}`
          console.log('Command', command)
          console.log('PATHOUTPUT', PATH_OUTPUT)
          console.log('PATH_TEMP', PATH_TEMP)
          console.log('randomName', randomName)
          const commandParts = command.split(' ')
          const spawnedProcess = spawn(commandParts[0], commandParts.slice(1))

          spawnedProcess.on('error', (error: any) => {
            console.error(`Error: ${error.message}`)
            return res.status(500).json({
              error: `Error durante la ejecucion del comando: ${error.message}`
            })
          })
          spawnedProcess.on('exit', (code: any) => {
            if (code !== 0) {
              console.error(`El comando ha fallado con el siguiente codigo de error: ${code}`)
              return res.status(500).json({
                error: `El Comando ejecutado ha fallado, codigo de error: ${code}`
              })
            }

            fs.unlink(`${TEMP_FOLDER}/${randomName}${FILE_EXTENSION}`, () => {})
            console.log('SongName', SongName)
            return res.status(200).json({
              nombre: SongName[0],
              fileName: randomName
            })
          })
        }, 20000)
      })

      .catch((err) => {
        return res.status(500).json({
          error: err
        })
      })
  } catch (err: any) {
    console.error('Error durante la descarga del video:', err)
    return res.status(500).json({
      error: `Error durante la descarga del video: ${err.message}`
    })
  }
})

app.get('/download/:id', (req, res) => {
  const file = `${UPLOADS_FOLDER}/${req.params.id}${FILE_EXTENSION}`
  res.download(file)
})

app.post('/youtubeSearch', (req, res) => {
  const search = req.body.search
  youtubeSearch(search)
    .then(e => {
      return res.status(200).json({
        data: e.items
      })
    })
    .catch(error => {
      console.log(error)
      return res.status(500).json({
        prueba: error
      })
    })
})

const youtubeSearch = async (name: string): Promise<any> => {
  const searchResults = await ytsr(name)
  return searchResults
}

app.listen(PORT, () => {
  console.log('Servidor Iniciado.')
})

const downloadVideo = async (link: string, randomName: string, SongName: string[]): Promise<void> => {
  try {
    const regex = /^https?:\/\/(?:www\.)?youtube\.com\/.*$/
    if (!regex.test(link)) {
      const regex2 = /^(http(s)?:\/\/)?((w){3}.)?youtu(be|.be)?(\.com)?\/.+/
      if (regex2.test(link)) {
        ytdl('https://' + link, { filter: 'audioonly' })
          .pipe(fs.createWriteStream(path.join(TEMP_FOLDER, randomName + FILE_EXTENSION)))

        const name = await ytdl.getInfo('https://' + link)
        SongName.push(name.videoDetails.title)
      } else {
        throw new Error('Error durante la descarga del video')
      }
    } else {
      ytdl(link, { filter: 'audioonly' })
        .pipe(fs.createWriteStream(path.join(TEMP_FOLDER, randomName + FILE_EXTENSION)))

      const name = await ytdl.getInfo(link)
      SongName.push(name.videoDetails.title)
    }
  } catch (err: any) {
    throw new Error(`Error durante la descarga del video: ${err.message}`)
  }
}
