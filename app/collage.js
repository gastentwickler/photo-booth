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
                } else {
                    callback(false, webappFilepath);
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

            this._createCollageIM(layout, convertedFilepath, options, images, function(err) {
                if (err) {
                    console.log("zeile 141");
                    callback(err);
                } else {
                    console.log("zeile 144");
                    callback(false, convertedFilepath);
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

        console.log("imagemagick start", layout, options, filePath);
        let rotate = 0;
        
        if (filePath.includes('hq')) {
            rotate=90;
        }

        // if (layout == 'PhotoFrame') {
        //     console.log("PhotoFrame erstellen");
      
        //     im.convert(['-size', '1772x1181', 'xc:black', 
        //                 '\(', 'Folie2.JPG', '-resize', '3000x2000', '-crop', '1658x1131+0+0', '\)', '-geometry', '+57+25', '-composite', 
        //                 '\(', images[0], '-resize', '1588x1058', '-crop', '1588x920+0+25', '\)', '-geometry', '+92+60', '-composite', 
        //                 '-fill', options.textcolor, '-stroke', options.textcolor, '-font', 'Manjari-Thin', '-pointsize', '70', '-gravity', 'center', '-annotate', '+0+460', 'Hochzeit Carmen & Mario', 
        //                 '-fill', options.textcolor, '-stroke', options.textcolor, '-font', 'Manjari-Thin', '-pointsize', '50', '-gravity', 'center', '-annotate', '+0+530', '28.09.2020', filePath], 
                           
        //                  function(error, stdout){
        //                     if (error) {
        //                         callback(error);} 
        //                     else {callback(false);}
        //                   }
        //                );
        // }


        if (layout == 'PhotoFrame') {
            console.log("PhotoFrame erstellen");
      
            im.convert(['-size', '1772x1181', 'xc:black', 
                        '-fill', options.backgroundColor, '-stroke', 'white', '-draw', 'rectangle 57,25 1715,1156',
                    //  '\(', 'Folie2.JPG', '-resize', '3000x2000', '-crop', '1658x1131+0+0', '\)', '-geometry', '+57+25', '-composite', 
                        '\(', images[0], '-resize', '1588x1058', '-crop', '1588x920+0+25', '\)', '-geometry', '+92+60', '-composite', 
                        '-fill', options.textcolor, '-stroke', options.textcolor, '-font', 'Manjari-Thin', '-pointsize', '70', '-gravity', 'center', '-annotate', '+0+460', options.text1, 
                        '-fill', options.textcolor, '-stroke', options.textcolor, '-font', 'Manjari-Thin', '-pointsize', '50', '-gravity', 'center', '-annotate', '+0+530', options.text2, 
                        '-colorspace', options.colorspace, 
                        filePath
                    ], 
                           
                         function(error, stdout){
                            if (error) {
                                callback(error);} 
                            else {callback(false);}
                          }
                       );
        }
        
        if (layout == '2erCollage') {
            console.log("2erCollage collage erstellen");
            
            im.convert(['-size', '1181x1772', 'xc:black', 
                        '-fill', options.backgroundColor, '-stroke', 'white', '-draw', 'rectangle 25,57 1156, 1715',
                    //  '\(', 'Folie2.JPG', '-resize', '3000x2000', '-crop', '1131x1658+0+0', '\)', '-geometry', '+25+57', '-composite', 
                        '\(', images[0], '-resize', '1051x700', '\)', '-geometry', '+65+97', '-composite', 
                        '\(', images[1], '-resize', '1051x700', '\)', '-geometry', '+65+837', '-composite', 
                        '-fill', options.textcolor, '-stroke', options.textcolor, '-font', 'Manjari-Thin', '-pointsize', '70', '-gravity', 'center', '-annotate', '+0+720', options.text1, 
                        '-fill', options.textcolor, '-stroke', options.textcolor, '-font', 'Manjari-Thin', '-pointsize', '50', '-gravity', 'center', '-annotate', '+0+790', options.text2, '-rotate', rotate, 
                        '-colorspace', options.colorspace, 
                        filePath
                    ], 
               
                         function(error, stdout){
                            if (error) {
                                callback(error);} 
                            else {callback(false);}
                          }
                       );

        }

/*         if (layout == '4erCollage') {
            console.log("4erCollage collage erstellen");
               
            im.convert(['-size', '1772x1181', 'xc:black', 
                        '-fill', options.backgroundColor, '-stroke', 'white', '-draw', 'rectangle 57,25 1715,1156',
                    //  '\(', 'Folie2.JPG', '-resize', '3000x2000', '-crop', '1658x1131+0+0', '\)', '-geometry', '+57+25', '-composite', 
                        '\(', images[0], '-resize', '765x510', '-crop', '765x430+0+20', '\)', '-geometry', '+97+65', '-composite', 
                        '\(', images[1], '-resize', '765x510', '-crop', '765x430+0+20', '\)', '-geometry', '+902+65', '-composite', 
                        '\(', images[2], '-resize', '765x510', '-crop', '765x430+0+20', '\)', '-geometry', '+97+535', '-composite', 
                        '\(', images[3], '-resize', '765x510', '-crop', '765x430+0+20', '\)', '-geometry', '+902+535', '-composite', 
                        '-fill', options.textcolor, '-stroke', options.textcolor, '-font', 'Manjari-Thin', '-pointsize', '70', '-gravity', 'center', '-annotate', '+0+445', options.text1, 
                        '-fill', options.textcolor, '-stroke', options.textcolor, '-font', 'Manjari-Thin', '-pointsize', '50', '-gravity', 'center', '-annotate', '+0+515', options.text2, 
                        '-colorspace', options.colorspace, 
                        filePath
                    ], 
               
                         function(error, stdout){
                            if (error) {
                                callback(error);} 
                            else {callback(false);}
                          }
                       );
        } */


        if (layout == '4erCollage') {
            console.log("4erCollage collage erstellen");
               
            im.convert(['-size', '1772x1181', 'xc:black', 
                        '-fill', options.backgroundColor, '-stroke', 'white', '-draw', 'rectangle 57,25 1715,1156',
                    //  '\(', 'Folie2.JPG', '-resize', '3000x2000', '-crop', '1658x1131+0+0', '\)', '-geometry', '+57+25', '-composite', 
                        '\(', images[0], '-resize', '783x440', '-crop', '779x440+2+0', '\)', '-geometry', '+97+65', '-composite', 
                        '\(', images[1], '-resize', '783x440', '-crop', '779x440+2+0', '\)', '-geometry', '+896+65', '-composite', 
                        '\(', images[2], '-resize', '783x440', '-crop', '779x440+2+0', '\)', '-geometry', '+97+525', '-composite', 
                        '\(', images[3], '-resize', '783x440', '-crop', '779x440+2+0', '\)', '-geometry', '+896+525', '-composite', 
                        '-fill', options.textcolor, '-stroke', options.textcolor, '-font', 'Manjari-Thin', '-pointsize', '70', '-gravity', 'center', '-annotate', '+0+445', options.text1, 
                        '-fill', options.textcolor, '-stroke', options.textcolor, '-font', 'Manjari-Thin', '-pointsize', '50', '-gravity', 'center', '-annotate', '+0+515', options.text2, 
                        '-colorspace', options.colorspace, 
                        filePath
                    ], 
               
                         function(error, stdout){
                            if (error) {
                                callback(error);} 
                            else {callback(false);}
                          }
                       );
        }

        if (layout == 'fotostreifen') {
            console.log("fotostreifen collage erstellen");

            im.convert(['-size', '1181x1772', 'xc:black', 
            '-fill', options.backgroundColor, '-stroke', 'white', '-draw', 'rectangle 25,57 1156, 1715',
        //  '\(', 'Folie2.JPG', '-resize', '3000x2000', '-crop', '1131x1658+0+0', '\)', '-geometry', '+25+57', '-composite', 
            '\(', images[0], '-resize', '567x378', '-crop', '505x378+31+0', '\)', '-geometry', '+55+150', '-composite',
            '\(', images[1], '-resize', '567x378', '-crop', '505x378+31+0', '\)', '-geometry', '+55+588', '-composite', 
            '\(', images[2], '-resize', '567x378', '-crop', '505x378+31+0', '\)', '-geometry', '+55+1026', '-composite', 
            '\(', images[3], '-resize', '567x378', '-crop', '505x378+31+0', '\)', '-geometry', '+620+150', '-composite', 
            '\(', images[4], '-resize', '567x378', '-crop', '505x378+31+0', '\)', '-geometry', '+620+588', '-composite', 
            '\(', images[5], '-resize', '567x378', '-crop', '505x378+31+0', '\)', '-geometry', '+620+1026', '-composite', 
 
            '-fill', options.textcolor, '-stroke', options.textcolor, '-font', 'Manjari-Thin', '-pointsize', '40', '-gravity', 'center', '-annotate', '-282+700', options.text1, 
            '-fill', options.textcolor, '-stroke', options.textcolor, '-font', 'Manjari-Thin', '-pointsize', '25', '-gravity', 'center', '-annotate', '-282+760', options.text2, 
            '-fill', options.textcolor, '-stroke', options.textcolor, '-font', 'Manjari-Thin', '-pointsize', '40', '-gravity', 'center', '-annotate', '+282+700', options.text1, 
            '-fill', options.textcolor, '-stroke', options.textcolor, '-font', 'Manjari-Thin', '-pointsize', '25', '-gravity', 'center', '-annotate', '+282+760', options.text2, 
            '-colorspace', options.colorspace,
            '-rotate', rotate, filePath], 

             function(error, stdout){
                if (error) {
                    callback(error);} 
                else {callback(false);}
              }
              );
            }
    


            if (layout == 'fotostreifen2') {
                console.log("fotostreifen2 collage erstellen");
    
                im.convert(['-size', '1181x1772', 'xc:black', 
                '-fill', options.backgroundColor, '-stroke', options.textcolor, '-draw', 'rectangle 25,57 1156, 1715',
            //  '\(', 'Folie2.JPG', '-resize', '3000x2000', '-crop', '1131x1658+0+0', '\)', '-geometry', '+25+57', '-composite', 
                '\(', images[0], '-resize', '567x378', '-crop', '505x378+31+0', '\)', '-geometry', '+55+150', '-composite',
                '\(', images[1], '-resize', '567x378', '-crop', '505x378+31+0', '\)', '-geometry', '+55+588', '-composite', 
                '\(', images[2], '-resize', '567x378', '-crop', '505x378+31+0', '\)', '-geometry', '+55+1026', '-composite', 
                '\(', images[0], '-resize', '567x378', '-crop', '505x378+31+0', '\)', '-geometry', '+620+150', '-composite', 
                '\(', images[1], '-resize', '567x378', '-crop', '505x378+31+0', '\)', '-geometry', '+620+588', '-composite', 
                '\(', images[2], '-resize', '567x378', '-crop', '505x378+31+0', '\)', '-geometry', '+620+1026', '-composite', 
     
                '-fill', options.textcolor, '-stroke', options.textcolor, '-font', 'Manjari-Thin', '-pointsize', '40', '-gravity', 'center', '-annotate', '-282+700', options.text1, 
                '-fill', options.textcolor, '-stroke', options.textcolor, '-font', 'Manjari-Thin', '-pointsize', '25', '-gravity', 'center', '-annotate', '-282+760', options.text2, 
                '-fill', options.textcolor, '-stroke', options.textcolor, '-font', 'Manjari-Thin', '-pointsize', '40', '-gravity', 'center', '-annotate', '+282+700', options.text1, 
                '-fill', options.textcolor, '-stroke', options.textcolor, '-font', 'Manjari-Thin', '-pointsize', '25', '-gravity', 'center', '-annotate', '+282+760', options.text2,
                '-colorspace', options.colorspace, 
                '-rotate', rotate, filePath], 
    
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