import path from 'path';
import fs from 'fs';
import { createHash } from 'crypto';
import { exec } from 'child_process';

import sharp from 'sharp';

import utils from "./utils.js";

var im = require('imagemagick');

class Collage {
    constructor() {
        this.printing = utils.getConfig().printing || { };
        this.layouts = this.printing.layouts || [];
    }

    getPlaceholderImage(layout, callback) {
        const options = this._getOptionsByLayout(layout);

        // Calculate filename by options (cache placeholders)
        const optionsAsJson = JSON.stringify(options);
        const optionsHash = createHash('md5').update(optionsAsJson).digest('hex');
        const fileName = layout + '_' + optionsHash + '.jpeg';
        const filePath = path.join(utils.getTempDir(), fileName);

        // Check existance
        if (fs.existsSync(filePath)) {
            callback(false, filePath);
            return;
        }

        const tempFile = path.join(utils.getTempDir(), layout + '_' + utils.getTimestamp() + '.jpeg');
        const that = this;
        sharp({
            create: {
                width: options.imageWidth,
                height: options.imageHeight,
                channels: 4,
                background: { r: 255, g: 255, b: 255, alpha: 0.5 }
            }
        })
        .jpeg()
        .toFile(tempFile, function(error) {
            if (error) {
                callback(error);
                return;
            }

            const images = new Array(options.width * options.height).fill(tempFile);
            const clonedOptions = JSON.parse(optionsAsJson);
            clonedOptions.dpi = 96;

            that._createCollage(filePath, clonedOptions, images, function(error) {
                utils.queueFileDeletion(tempFile);

                if (error) {
                    callback(error);
                } else {
                    callback(false, filePath);
                }
            });
        });
    }

    createPreviewCollage(layout, images, callback) {
        const newFilename = 'print_' + utils.getTimestamp() + '.jpeg';
        const convertedFilepath = path.join(utils.getTempDir(), newFilename);
        const webappFilepath = path.join('photos', 'tmp', newFilename);

        const options = this._getOptionsByLayout(layout);
        const clonedOptions = JSON.parse(JSON.stringify(options));
        clonedOptions.dpi = 96;

              
        // Collage mit ImageMagick erstellen wenn in Layout Optionen so festgelegt (gastenwickler Jan 2020)
     
        if (options.generation == "imagemagick") {

            this._createCollageIM(layout, convertedFilepath, clonedOptions, images, function(err) {
                utils.queueFileDeletion(convertedFilepath);
    
                if (err) {
                    callback(err);
                    console.log("zeile 85");
                } else {
                    callback(false, webappFilepath);
                    console.log("zeile 88");
                }
            }
    
            );
        }

        else {

        this._createCollage(convertedFilepath, clonedOptions, images, function(err) {
            utils.queueFileDeletion(convertedFilepath);

            if (err) {
                callback(err);
            } else {
                callback(false, webappFilepath);
            }
        });
    }
    }

    createCollage(layout, images, callback) {
        const newFilename = 'print_' + utils.getTimestamp() + '.jpeg';
        const convertedFilepath = path.join(utils.getFullSizePhotosDirectory(), newFilename);

        const options = this._getOptionsByLayout(layout);
   
     
              
        // Collage mit ImageMagick erstellen wenn in Layout Optionen so festgelegt (gastenwickler Jan 2020)
     
        if (options.generation == "imagemagick") {

            this._createCollageIM(convertedFilepath, options, images, function(err) {
                if (err) {
                    callback(err);
                    console.log("zeile 141");
                } else {
                    callback(false, convertedFilepath);
                    console.log("zeile 144");
                }
            }
    
            );
        }

        else {



        this._createCollage(convertedFilepath, options, images, function(err) {
            if (err) {
                callback(err);
            } else {
                callback(false, convertedFilepath);
            }
        });
             }
    }

    _createCollage(filePath, options, images, callback) {
        const layoutAsBase64 = new Buffer(JSON.stringify(options)).toString('base64');
        const optionsAsBase64 = new Buffer(JSON.stringify({
            grayscale: this.printing.grayscale,
            overlay: this.printing.overlay
        })).toString('base64');
        const params = [
            'node',
            './collage-process.js',
            filePath,
            layoutAsBase64,
            optionsAsBase64
        ];

        params.push(...images);

        const childProcess = exec(params.join(' '), {
            cwd: './helpers/collage'
        }, function(error, stdout, stderr) {
            if (error) {
                callback(error);
            } else {
                callback(false);
            }
        });
    }

    //Collage mit Imagemagick erstellen (Gastenwickler Jan 2020)
    _createCollageIM(layout, filePath, options, images, callback) {

        console.log("imagemagick start");
        console.log("filePath: ", filePath, "options:", options, "images: ", images );
       
        if (layout == 'PhotoFrame') {
            console.log("PhotoFrame erstellen");
      
            im.convert(['-size', '1772x1181', 'xc:gray', '\(', images[0], '-resize', '1632x1088', '-crop', '1632x918+0+34', '\)', '-geometry', '+70+70', '-composite', 
                        '-fill', 'white', '-stroke', 'gray', '-font', 'Manjari-Thin', '-pointsize', '70', '-gravity', 'center', '-annotate', '+0+480', 'Mareike & Sebastian', 
                        '-fill', 'white', '-stroke', 'gray', '-font', 'Manjari-Thin', '-pointsize', '50', '-gravity', 'center', '-annotate', '+0+540', '28.09.2020', filePath], 
               
                         function(error, stdout){
                            if (error) {
                                callback(error);} 
                            else {callback(false);}
                          }
                       );
        }
        
        if (layout == '2erCollage') {
            console.log("2erCollage collage erstellen");
            
            im.convert(['-size', '1181x1772', 'xc:gray', 
                        '\(', images[0], '-resize', '1100x730', '\)', '-geometry', '+35+55', '-composite', 
                        '\(', images[1], '-resize', '1100x730', '\)', '-geometry', '+35+820', '-composite', 
                        '-fill', 'white', '-stroke', 'white', '-font', 'Manjari-Thin', '-pointsize', '70', '-gravity', 'center', '-annotate', '+0+770', 'Mareike & Sebastian', 
                        '-fill', 'white', '-stroke', 'white', '-font', 'Manjari-Thin', '-pointsize', '50', '-gravity', 'center', '-annotate', '+0+840', '28.09.2020', filePath], 
               
                         function(error, stdout){
                            if (error) {
                                callback(error);} 
                            else {callback(false);}
                          }
                       );

        }

        if (layout == '4erCollage') {
            console.log("4erCollage collage erstellen");

            im.convert(['-size', '1772x1181', 'xc:gray', 
                        '\(', images[0], '-resize', '797x531', '-crop', '797x448+0+40', '\)', '-geometry', '+59+39', '-composite', 
                        '\(', images[1], '-resize', '797x531', '-crop', '797x448+0+40', '\)', '-geometry', '+915+39', '-composite', 
                        '\(', images[2], '-resize', '797x531', '-crop', '797x448+0+40', '\)', '-geometry', '+59+550', '-composite', 
                        '\(', images[3], '-resize', '797x531', '-crop', '797x448+0+40', '\)', '-geometry', '+915+550', '-composite', 
                        '-fill', 'white', '-stroke', 'gray', '-font', 'Manjari-Thin', '-pointsize', '70', '-gravity', 'center', '-annotate', '+0+490', '50. Geburtstag Onkel Jürgen', 
                        '-fill', 'white', '-stroke', 'gray', '-font', 'Manjari-Thin', '-pointsize', '50', '-gravity', 'center', '-annotate', '+0+550', 'Partytime 28.09.2020', filePath], 
               
                         function(error, stdout){
                            if (error) {
                                callback(error);} 
                            else {callback(false);}
                          }
                       );
        }

        if (layout == 'fotostreifen') {
            console.log("fotostreifen collage erstellen");

            im.convert(['-size', '1181x1772', 'xc:gray', 
            '\(', images[0], '-resize', '597x398', '-crop', '520x398+38+0', '\)', '-geometry', '+35+90', '-composite',
            '\(', images[1], '-resize', '597x398', '-crop', '520x398+38+0', '\)', '-geometry', '+35+578', '-composite', 
            '\(', images[2], '-resize', '597x398', '-crop', '520x398+38+0', '\)', '-geometry', '+35+1066', '-composite', 
            '\(', images[3], '-resize', '597x398', '-crop', '520x398+38+0', '\)', '-geometry', '+625+90', '-composite', 
            '\(', images[4], '-resize', '597x398', '-crop', '520x398+38+0', '\)', '-geometry', '+625+578', '-composite', 
            '\(', images[5], '-resize', '597x398', '-crop', '520x398+38+0', '\)', '-geometry', '+625+1066', '-composite', 
 
            '-fill', 'white', '-stroke', 'white', '-font', 'Manjari-Thin', '-pointsize', '50', '-gravity', 'center', '-annotate', '-300+720', '50. Geburtstag Onkel Jürgen', 
            '-fill', 'white', '-stroke', 'white', '-font', 'Manjari-Thin', '-pointsize', '30', '-gravity', 'center', '-annotate', '-300+790', 'Partytime 28.09.2020', 
            '-fill', 'white', '-stroke', 'white', '-font', 'Manjari-Thin', '-pointsize', '50', '-gravity', 'center', '-annotate', '+300+720', '50. Geburtstag Onkel Jürgen', 
            '-fill', 'white', '-stroke', 'white', '-font', 'Manjari-Thin', '-pointsize', '30', '-gravity', 'center', '-annotate', '+300+790', 'Partytime 28.09.2020', 
            filePath], 

             function(error, stdout){
                if (error) {
                    callback(error);} 
                else {callback(false);}
              }
              );
            }
    


        console.log("imagemagick ende filename:" + filePath);

    }




    _getOptionsByLayout(layoutName) {
        const layout = this.layouts.find(e => e.key === layoutName);
        if (layout === undefined) {
            throw new Error('Layout ' + layoutName + ' is not defined!');
        }

        return layout.options;
    }
}

let collage = new Collage();
export { collage as default };