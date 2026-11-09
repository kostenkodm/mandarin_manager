'use strict';
'require view';
'require rpc';
'require ui';
'require dom';

var callStatus = rpc.declare({ object: 'mandarinvpn', method: 'status', expect: {} });
var callUpgrade = rpc.declare({ object: 'mandarinvpn', method: 'upgrade', expect: {} });
var callGuestDiagnose = rpc.declare({ object: 'mandarinvpn', method: 'guest_diagnose', expect: {} });
var callPeers = rpc.declare({ object: 'mandarinvpn', method: 'peers', params: [ 'interface' ], expect: {} });
var callCreateHome = rpc.declare({ object: 'mandarinvpn', method: 'add_home', params: [ 'name' ], expect: {} });
var callCreate = rpc.declare({ object: 'mandarinvpn', method: 'add_guest', params: [ 'name' ], expect: {} });
var callDisable = rpc.declare({ object: 'mandarinvpn', method: 'disable_guest', params: [ 'name' ], expect: {} });
var callEnable = rpc.declare({ object: 'mandarinvpn', method: 'enable_guest', params: [ 'name' ], expect: {} });
var callDelete = rpc.declare({ object: 'mandarinvpn', method: 'delete_guest', params: [ 'name' ], expect: {} });
var callProfile = rpc.declare({ object: 'mandarinvpn', method: 'guest_profile', params: [ 'name' ], expect: {} });
var callManagedProfile = rpc.declare({ object: 'mandarinvpn', method: 'managed_profile', params: [ 'interface', 'name' ], expect: {} });
var callMigrationPrepare = rpc.declare({ object: 'mandarinvpn', method: 'migrate_prepare', params: [ 'interface', 'section', 'name' ], expect: {} });
var callMigrationFinish = rpc.declare({ object: 'mandarinvpn', method: 'migrate_finish', params: [ 'interface', 'name' ], expect: {} });
var callMigrationCancel = rpc.declare({ object: 'mandarinvpn', method: 'migrate_cancel', params: [ 'interface', 'name' ], expect: {} });

// Offline QR matrix implementation adapted from Kazuhiko Arase's MIT-licensed
// QRCode for JavaScript (2009). Source: qrcode-terminal/vendor/QRCode.
// Profiles and private keys never leave this browser session.
var qrCodeLocal = (function() {
    var factories = {
    'QR8bitByte': function(module, exports, require) {
var QRMode = require('./QRMode');

function QR8bitByte(data) {
	this.mode = QRMode.MODE_8BIT_BYTE;
	this.data = data;
}

QR8bitByte.prototype = {

	getLength : function() {
		return this.data.length;
	},
	
	write : function(buffer) {
		for (var i = 0; i < this.data.length; i++) {
			// not JIS ...
			buffer.put(this.data.charCodeAt(i), 8);
		}
	}
};

module.exports = QR8bitByte;

    },
    'QRBitBuffer': function(module, exports, require) {
function QRBitBuffer() {
	this.buffer = [];
	this.length = 0;
}

QRBitBuffer.prototype = {

	get : function(index) {
		var bufIndex = Math.floor(index / 8);
		return ( (this.buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
	},
	
	put : function(num, length) {
		for (var i = 0; i < length; i++) {
			this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
		}
	},
	
	getLengthInBits : function() {
		return this.length;
	},
	
	putBit : function(bit) {
	
		var bufIndex = Math.floor(this.length / 8);
		if (this.buffer.length <= bufIndex) {
			this.buffer.push(0);
		}
	
		if (bit) {
			this.buffer[bufIndex] |= (0x80 >>> (this.length % 8) );
		}
	
		this.length++;
	}
};

module.exports = QRBitBuffer;

    },
    'QRErrorCorrectLevel': function(module, exports, require) {
module.exports = {
	L : 1,
	M : 0,
	Q : 3,
	H : 2
};


    },
    'QRMaskPattern': function(module, exports, require) {
module.exports = {
	PATTERN000 : 0,
	PATTERN001 : 1,
	PATTERN010 : 2,
	PATTERN011 : 3,
	PATTERN100 : 4,
	PATTERN101 : 5,
	PATTERN110 : 6,
	PATTERN111 : 7
};

    },
    'QRMath': function(module, exports, require) {
var QRMath = {

	glog : function(n) {
	
		if (n < 1) {
			throw new Error("glog(" + n + ")");
		}
		
		return QRMath.LOG_TABLE[n];
	},
	
	gexp : function(n) {
	
		while (n < 0) {
			n += 255;
		}
	
		while (n >= 256) {
			n -= 255;
		}
	
		return QRMath.EXP_TABLE[n];
	},
	
	EXP_TABLE : new Array(256),
	
	LOG_TABLE : new Array(256)

};
	
for (var i = 0; i < 8; i++) {
	QRMath.EXP_TABLE[i] = 1 << i;
}
for (var i = 8; i < 256; i++) {
	QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4]
		^ QRMath.EXP_TABLE[i - 5]
		^ QRMath.EXP_TABLE[i - 6]
		^ QRMath.EXP_TABLE[i - 8];
}
for (var i = 0; i < 255; i++) {
	QRMath.LOG_TABLE[QRMath.EXP_TABLE[i] ] = i;
}

module.exports = QRMath;

    },
    'QRMode': function(module, exports, require) {
module.exports = {
    MODE_NUMBER :       1 << 0,
    MODE_ALPHA_NUM :    1 << 1,
    MODE_8BIT_BYTE :    1 << 2,
    MODE_KANJI :        1 << 3
};

    },
    'QRPolynomial': function(module, exports, require) {
var QRMath = require('./QRMath');

function QRPolynomial(num, shift) {
	if (num.length === undefined) {
		throw new Error(num.length + "/" + shift);
	}

	var offset = 0;

	while (offset < num.length && num[offset] === 0) {
		offset++;
	}

	this.num = new Array(num.length - offset + shift);
	for (var i = 0; i < num.length - offset; i++) {
		this.num[i] = num[i + offset];
	}
}

QRPolynomial.prototype = {

	get : function(index) {
		return this.num[index];
	},
	
	getLength : function() {
		return this.num.length;
	},
	
	multiply : function(e) {
	
		var num = new Array(this.getLength() + e.getLength() - 1);
	
		for (var i = 0; i < this.getLength(); i++) {
			for (var j = 0; j < e.getLength(); j++) {
				num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i) ) + QRMath.glog(e.get(j) ) );
			}
		}
	
		return new QRPolynomial(num, 0);
	},
	
	mod : function(e) {
	
		if (this.getLength() - e.getLength() < 0) {
			return this;
		}
	
		var ratio = QRMath.glog(this.get(0) ) - QRMath.glog(e.get(0) );
	
		var num = new Array(this.getLength() );
		
		for (var i = 0; i < this.getLength(); i++) {
			num[i] = this.get(i);
		}
		
		for (var x = 0; x < e.getLength(); x++) {
			num[x] ^= QRMath.gexp(QRMath.glog(e.get(x) ) + ratio);
		}
	
		// recursive call
		return new QRPolynomial(num, 0).mod(e);
	}
};

module.exports = QRPolynomial;

    },
    'QRRSBlock': function(module, exports, require) {
var QRErrorCorrectLevel = require('./QRErrorCorrectLevel');

function QRRSBlock(totalCount, dataCount) {
	this.totalCount = totalCount;
	this.dataCount  = dataCount;
}

QRRSBlock.RS_BLOCK_TABLE = [

	// L
	// M
	// Q
	// H

	// 1
	[1, 26, 19],
	[1, 26, 16],
	[1, 26, 13],
	[1, 26, 9],
	
	// 2
	[1, 44, 34],
	[1, 44, 28],
	[1, 44, 22],
	[1, 44, 16],

	// 3
	[1, 70, 55],
	[1, 70, 44],
	[2, 35, 17],
	[2, 35, 13],

	// 4		
	[1, 100, 80],
	[2, 50, 32],
	[2, 50, 24],
	[4, 25, 9],
	
	// 5
	[1, 134, 108],
	[2, 67, 43],
	[2, 33, 15, 2, 34, 16],
	[2, 33, 11, 2, 34, 12],
	
	// 6
	[2, 86, 68],
	[4, 43, 27],
	[4, 43, 19],
	[4, 43, 15],
	
	// 7		
	[2, 98, 78],
	[4, 49, 31],
	[2, 32, 14, 4, 33, 15],
	[4, 39, 13, 1, 40, 14],
	
	// 8
	[2, 121, 97],
	[2, 60, 38, 2, 61, 39],
	[4, 40, 18, 2, 41, 19],
	[4, 40, 14, 2, 41, 15],
	
	// 9
	[2, 146, 116],
	[3, 58, 36, 2, 59, 37],
	[4, 36, 16, 4, 37, 17],
	[4, 36, 12, 4, 37, 13],
	
	// 10		
	[2, 86, 68, 2, 87, 69],
	[4, 69, 43, 1, 70, 44],
	[6, 43, 19, 2, 44, 20],
	[6, 43, 15, 2, 44, 16],

	// 11
	[4, 101, 81],
	[1, 80, 50, 4, 81, 51],
	[4, 50, 22, 4, 51, 23],
	[3, 36, 12, 8, 37, 13],

	// 12
	[2, 116, 92, 2, 117, 93],
	[6, 58, 36, 2, 59, 37],
	[4, 46, 20, 6, 47, 21],
	[7, 42, 14, 4, 43, 15],

	// 13
	[4, 133, 107],
	[8, 59, 37, 1, 60, 38],
	[8, 44, 20, 4, 45, 21],
	[12, 33, 11, 4, 34, 12],

	// 14
	[3, 145, 115, 1, 146, 116],
	[4, 64, 40, 5, 65, 41],
	[11, 36, 16, 5, 37, 17],
	[11, 36, 12, 5, 37, 13],

	// 15
	[5, 109, 87, 1, 110, 88],
	[5, 65, 41, 5, 66, 42],
	[5, 54, 24, 7, 55, 25],
	[11, 36, 12],

	// 16
	[5, 122, 98, 1, 123, 99],
	[7, 73, 45, 3, 74, 46],
	[15, 43, 19, 2, 44, 20],
	[3, 45, 15, 13, 46, 16],

	// 17
	[1, 135, 107, 5, 136, 108],
	[10, 74, 46, 1, 75, 47],
	[1, 50, 22, 15, 51, 23],
	[2, 42, 14, 17, 43, 15],

	// 18
	[5, 150, 120, 1, 151, 121],
	[9, 69, 43, 4, 70, 44],
	[17, 50, 22, 1, 51, 23],
	[2, 42, 14, 19, 43, 15],

	// 19
	[3, 141, 113, 4, 142, 114],
	[3, 70, 44, 11, 71, 45],
	[17, 47, 21, 4, 48, 22],
	[9, 39, 13, 16, 40, 14],

	// 20
	[3, 135, 107, 5, 136, 108],
	[3, 67, 41, 13, 68, 42],
	[15, 54, 24, 5, 55, 25],
	[15, 43, 15, 10, 44, 16],

	// 21
	[4, 144, 116, 4, 145, 117],
	[17, 68, 42],
	[17, 50, 22, 6, 51, 23],
	[19, 46, 16, 6, 47, 17],

	// 22
	[2, 139, 111, 7, 140, 112],
	[17, 74, 46],
	[7, 54, 24, 16, 55, 25],
	[34, 37, 13],

	// 23
	[4, 151, 121, 5, 152, 122],
	[4, 75, 47, 14, 76, 48],
	[11, 54, 24, 14, 55, 25],
	[16, 45, 15, 14, 46, 16],

	// 24
	[6, 147, 117, 4, 148, 118],
	[6, 73, 45, 14, 74, 46],
	[11, 54, 24, 16, 55, 25],
	[30, 46, 16, 2, 47, 17],

	// 25
	[8, 132, 106, 4, 133, 107],
	[8, 75, 47, 13, 76, 48],
	[7, 54, 24, 22, 55, 25],
	[22, 45, 15, 13, 46, 16],

	// 26
	[10, 142, 114, 2, 143, 115],
	[19, 74, 46, 4, 75, 47],
	[28, 50, 22, 6, 51, 23],
	[33, 46, 16, 4, 47, 17],

	// 27
	[8, 152, 122, 4, 153, 123],
	[22, 73, 45, 3, 74, 46],
	[8, 53, 23, 26, 54, 24],
	[12, 45, 15, 28, 46, 16],

	// 28
	[3, 147, 117, 10, 148, 118],
	[3, 73, 45, 23, 74, 46],
	[4, 54, 24, 31, 55, 25],
	[11, 45, 15, 31, 46, 16],

	// 29
	[7, 146, 116, 7, 147, 117],
	[21, 73, 45, 7, 74, 46],
	[1, 53, 23, 37, 54, 24],
	[19, 45, 15, 26, 46, 16],

	// 30
	[5, 145, 115, 10, 146, 116],
	[19, 75, 47, 10, 76, 48],
	[15, 54, 24, 25, 55, 25],
	[23, 45, 15, 25, 46, 16],

	// 31
	[13, 145, 115, 3, 146, 116],
	[2, 74, 46, 29, 75, 47],
	[42, 54, 24, 1, 55, 25],
	[23, 45, 15, 28, 46, 16],

	// 32
	[17, 145, 115],
	[10, 74, 46, 23, 75, 47],
	[10, 54, 24, 35, 55, 25],
	[19, 45, 15, 35, 46, 16],

	// 33
	[17, 145, 115, 1, 146, 116],
	[14, 74, 46, 21, 75, 47],
	[29, 54, 24, 19, 55, 25],
	[11, 45, 15, 46, 46, 16],

	// 34
	[13, 145, 115, 6, 146, 116],
	[14, 74, 46, 23, 75, 47],
	[44, 54, 24, 7, 55, 25],
	[59, 46, 16, 1, 47, 17],

	// 35
	[12, 151, 121, 7, 152, 122],
	[12, 75, 47, 26, 76, 48],
	[39, 54, 24, 14, 55, 25],
	[22, 45, 15, 41, 46, 16],

	// 36
	[6, 151, 121, 14, 152, 122],
	[6, 75, 47, 34, 76, 48],
	[46, 54, 24, 10, 55, 25],
	[2, 45, 15, 64, 46, 16],

	// 37
	[17, 152, 122, 4, 153, 123],
	[29, 74, 46, 14, 75, 47],
	[49, 54, 24, 10, 55, 25],
	[24, 45, 15, 46, 46, 16],

	// 38
	[4, 152, 122, 18, 153, 123],
	[13, 74, 46, 32, 75, 47],
	[48, 54, 24, 14, 55, 25],
	[42, 45, 15, 32, 46, 16],

	// 39
	[20, 147, 117, 4, 148, 118],
	[40, 75, 47, 7, 76, 48],
	[43, 54, 24, 22, 55, 25],
	[10, 45, 15, 67, 46, 16],

	// 40
	[19, 148, 118, 6, 149, 119],
	[18, 75, 47, 31, 76, 48],
	[34, 54, 24, 34, 55, 25],
	[20, 45, 15, 61, 46, 16]
];

QRRSBlock.getRSBlocks = function(typeNumber, errorCorrectLevel) {
	
	var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
	
	if (rsBlock === undefined) {
		throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
	}

	var length = rsBlock.length / 3;
	
	var list = [];
	
	for (var i = 0; i < length; i++) {

		var count = rsBlock[i * 3 + 0];
		var totalCount = rsBlock[i * 3 + 1];
		var dataCount  = rsBlock[i * 3 + 2];

		for (var j = 0; j < count; j++) {
			list.push(new QRRSBlock(totalCount, dataCount) );	
		}
	}
	
	return list;
};

QRRSBlock.getRsBlockTable = function(typeNumber, errorCorrectLevel) {

	switch(errorCorrectLevel) {
	case QRErrorCorrectLevel.L :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
	case QRErrorCorrectLevel.M :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
	case QRErrorCorrectLevel.Q :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
	case QRErrorCorrectLevel.H :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
	default :
		return undefined;
	}
};

module.exports = QRRSBlock;

    },
    'QRUtil': function(module, exports, require) {
var QRMode = require('./QRMode');
var QRPolynomial = require('./QRPolynomial');
var QRMath = require('./QRMath');
var QRMaskPattern = require('./QRMaskPattern');

var QRUtil = {

    PATTERN_POSITION_TABLE : [
        [],
        [6, 18],
        [6, 22],
        [6, 26],
        [6, 30],
        [6, 34],
        [6, 22, 38],
        [6, 24, 42],
        [6, 26, 46],
        [6, 28, 50],
        [6, 30, 54],        
        [6, 32, 58],
        [6, 34, 62],
        [6, 26, 46, 66],
        [6, 26, 48, 70],
        [6, 26, 50, 74],
        [6, 30, 54, 78],
        [6, 30, 56, 82],
        [6, 30, 58, 86],
        [6, 34, 62, 90],
        [6, 28, 50, 72, 94],
        [6, 26, 50, 74, 98],
        [6, 30, 54, 78, 102],
        [6, 28, 54, 80, 106],
        [6, 32, 58, 84, 110],
        [6, 30, 58, 86, 114],
        [6, 34, 62, 90, 118],
        [6, 26, 50, 74, 98, 122],
        [6, 30, 54, 78, 102, 126],
        [6, 26, 52, 78, 104, 130],
        [6, 30, 56, 82, 108, 134],
        [6, 34, 60, 86, 112, 138],
        [6, 30, 58, 86, 114, 142],
        [6, 34, 62, 90, 118, 146],
        [6, 30, 54, 78, 102, 126, 150],
        [6, 24, 50, 76, 102, 128, 154],
        [6, 28, 54, 80, 106, 132, 158],
        [6, 32, 58, 84, 110, 136, 162],
        [6, 26, 54, 82, 110, 138, 166],
        [6, 30, 58, 86, 114, 142, 170]
    ],

    G15 : (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
    G18 : (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
    G15_MASK : (1 << 14) | (1 << 12) | (1 << 10)    | (1 << 4) | (1 << 1),

    getBCHTypeInfo : function(data) {
        var d = data << 10;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
            d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) ) );    
        }
        return ( (data << 10) | d) ^ QRUtil.G15_MASK;
    },

    getBCHTypeNumber : function(data) {
        var d = data << 12;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
            d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) ) );    
        }
        return (data << 12) | d;
    },

    getBCHDigit : function(data) {

        var digit = 0;

        while (data !== 0) {
            digit++;
            data >>>= 1;
        }

        return digit;
    },

    getPatternPosition : function(typeNumber) {
        return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
    },

    getMask : function(maskPattern, i, j) {
        
        switch (maskPattern) {
            
        case QRMaskPattern.PATTERN000 : return (i + j) % 2 === 0;
        case QRMaskPattern.PATTERN001 : return i % 2 === 0;
        case QRMaskPattern.PATTERN010 : return j % 3 === 0;
        case QRMaskPattern.PATTERN011 : return (i + j) % 3 === 0;
        case QRMaskPattern.PATTERN100 : return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 === 0;
        case QRMaskPattern.PATTERN101 : return (i * j) % 2 + (i * j) % 3 === 0;
        case QRMaskPattern.PATTERN110 : return ( (i * j) % 2 + (i * j) % 3) % 2 === 0;
        case QRMaskPattern.PATTERN111 : return ( (i * j) % 3 + (i + j) % 2) % 2 === 0;

        default :
            throw new Error("bad maskPattern:" + maskPattern);
        }
    },

    getErrorCorrectPolynomial : function(errorCorrectLength) {

        var a = new QRPolynomial([1], 0);

        for (var i = 0; i < errorCorrectLength; i++) {
            a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0) );
        }

        return a;
    },

    getLengthInBits : function(mode, type) {

        if (1 <= type && type < 10) {

            // 1 - 9

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 10;
            case QRMode.MODE_ALPHA_NUM  : return 9;
            case QRMode.MODE_8BIT_BYTE  : return 8;
            case QRMode.MODE_KANJI      : return 8;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 27) {

            // 10 - 26

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 12;
            case QRMode.MODE_ALPHA_NUM  : return 11;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 10;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 41) {

            // 27 - 40

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 14;
            case QRMode.MODE_ALPHA_NUM  : return 13;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 12;
            default :
                throw new Error("mode:" + mode);
            }

        } else {
            throw new Error("type:" + type);
        }
    },

    getLostPoint : function(qrCode) {
        
        var moduleCount = qrCode.getModuleCount();
        var lostPoint = 0;
        var row = 0; 
        var col = 0;

        
        // LEVEL1
        
        for (row = 0; row < moduleCount; row++) {

            for (col = 0; col < moduleCount; col++) {

                var sameCount = 0;
                var dark = qrCode.isDark(row, col);

                for (var r = -1; r <= 1; r++) {

                    if (row + r < 0 || moduleCount <= row + r) {
                        continue;
                    }

                    for (var c = -1; c <= 1; c++) {

                        if (col + c < 0 || moduleCount <= col + c) {
                            continue;
                        }

                        if (r === 0 && c === 0) {
                            continue;
                        }

                        if (dark === qrCode.isDark(row + r, col + c) ) {
                            sameCount++;
                        }
                    }
                }

                if (sameCount > 5) {
                    lostPoint += (3 + sameCount - 5);
                }
            }
        }

        // LEVEL2

        for (row = 0; row < moduleCount - 1; row++) {
            for (col = 0; col < moduleCount - 1; col++) {
                var count = 0;
                if (qrCode.isDark(row,     col    ) ) count++;
                if (qrCode.isDark(row + 1, col    ) ) count++;
                if (qrCode.isDark(row,     col + 1) ) count++;
                if (qrCode.isDark(row + 1, col + 1) ) count++;
                if (count === 0 || count === 4) {
                    lostPoint += 3;
                }
            }
        }

        // LEVEL3

        for (row = 0; row < moduleCount; row++) {
            for (col = 0; col < moduleCount - 6; col++) {
                if (qrCode.isDark(row, col) && 
                        !qrCode.isDark(row, col + 1) && 
                         qrCode.isDark(row, col + 2) && 
                         qrCode.isDark(row, col + 3) && 
                         qrCode.isDark(row, col + 4) && 
                        !qrCode.isDark(row, col + 5) && 
                         qrCode.isDark(row, col + 6) ) {
                    lostPoint += 40;
                }
            }
        }

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount - 6; row++) {
                if (qrCode.isDark(row, col) &&
                        !qrCode.isDark(row + 1, col) &&
                         qrCode.isDark(row + 2, col) &&
                         qrCode.isDark(row + 3, col) &&
                         qrCode.isDark(row + 4, col) &&
                        !qrCode.isDark(row + 5, col) &&
                         qrCode.isDark(row + 6, col) ) {
                    lostPoint += 40;
                }
            }
        }

        // LEVEL4
        
        var darkCount = 0;

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount; row++) {
                if (qrCode.isDark(row, col) ) {
                    darkCount++;
                }
            }
        }
        
        var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
        lostPoint += ratio * 10;

        return lostPoint;       
    }

};

module.exports = QRUtil;

    },
    'index': function(module, exports, require) {
//---------------------------------------------------------------------
// QRCode for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//   http://www.opensource.org/licenses/mit-license.php
//
// The word "QR Code" is registered trademark of 
// DENSO WAVE INCORPORATED
//   http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------
// Modified to work in node for this project (and some refactoring)
//---------------------------------------------------------------------

var QR8bitByte = require('./QR8bitByte');
var QRUtil = require('./QRUtil');
var QRPolynomial = require('./QRPolynomial');
var QRRSBlock = require('./QRRSBlock');
var QRBitBuffer = require('./QRBitBuffer');

function QRCode(typeNumber, errorCorrectLevel) {
	this.typeNumber = typeNumber;
	this.errorCorrectLevel = errorCorrectLevel;
	this.modules = null;
	this.moduleCount = 0;
	this.dataCache = null;
	this.dataList = [];
}

QRCode.prototype = {
	
	addData : function(data) {
		var newData = new QR8bitByte(data);
		this.dataList.push(newData);
		this.dataCache = null;
	},
	
	isDark : function(row, col) {
		if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
			throw new Error(row + "," + col);
		}
		return this.modules[row][col];
	},

	getModuleCount : function() {
		return this.moduleCount;
	},
	
	make : function() {
		// Calculate automatically typeNumber if provided is < 1
		if (this.typeNumber < 1 ){
			var typeNumber = 1;
			for (typeNumber = 1; typeNumber < 40; typeNumber++) {
				var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);

				var buffer = new QRBitBuffer();
				var totalDataCount = 0;
				for (var i = 0; i < rsBlocks.length; i++) {
					totalDataCount += rsBlocks[i].dataCount;
				}

				for (var x = 0; x < this.dataList.length; x++) {
					var data = this.dataList[x];
					buffer.put(data.mode, 4);
					buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
					data.write(buffer);
				}
				if (buffer.getLengthInBits() <= totalDataCount * 8)
					break;
			}
			this.typeNumber = typeNumber;
		}
		this.makeImpl(false, this.getBestMaskPattern() );
	},
	
	makeImpl : function(test, maskPattern) {
		
		this.moduleCount = this.typeNumber * 4 + 17;
		this.modules = new Array(this.moduleCount);
		
		for (var row = 0; row < this.moduleCount; row++) {
			
			this.modules[row] = new Array(this.moduleCount);
			
			for (var col = 0; col < this.moduleCount; col++) {
				this.modules[row][col] = null;//(col + row) % 3;
			}
		}
	
		this.setupPositionProbePattern(0, 0);
		this.setupPositionProbePattern(this.moduleCount - 7, 0);
		this.setupPositionProbePattern(0, this.moduleCount - 7);
		this.setupPositionAdjustPattern();
		this.setupTimingPattern();
		this.setupTypeInfo(test, maskPattern);
		
		if (this.typeNumber >= 7) {
			this.setupTypeNumber(test);
		}
	
		if (this.dataCache === null) {
			this.dataCache = QRCode.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
		}
	
		this.mapData(this.dataCache, maskPattern);
	},

	setupPositionProbePattern : function(row, col)  {
		
		for (var r = -1; r <= 7; r++) {
			
			if (row + r <= -1 || this.moduleCount <= row + r) continue;
			
			for (var c = -1; c <= 7; c++) {
				
				if (col + c <= -1 || this.moduleCount <= col + c) continue;
				
				if ( (0 <= r && r <= 6 && (c === 0 || c === 6) ) || 
                     (0 <= c && c <= 6 && (r === 0 || r === 6) ) || 
                     (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
					this.modules[row + r][col + c] = true;
				} else {
					this.modules[row + r][col + c] = false;
				}
			}		
		}		
	},
	
	getBestMaskPattern : function() {
	
		var minLostPoint = 0;
		var pattern = 0;
	
		for (var i = 0; i < 8; i++) {
			
			this.makeImpl(true, i);
	
			var lostPoint = QRUtil.getLostPoint(this);
	
			if (i === 0 || minLostPoint >  lostPoint) {
				minLostPoint = lostPoint;
				pattern = i;
			}
		}
	
		return pattern;
	},
	
	createMovieClip : function(target_mc, instance_name, depth) {
	
		var qr_mc = target_mc.createEmptyMovieClip(instance_name, depth);
		var cs = 1;
	
		this.make();

		for (var row = 0; row < this.modules.length; row++) {
			
			var y = row * cs;
			
			for (var col = 0; col < this.modules[row].length; col++) {
	
				var x = col * cs;
				var dark = this.modules[row][col];
			
				if (dark) {
					qr_mc.beginFill(0, 100);
					qr_mc.moveTo(x, y);
					qr_mc.lineTo(x + cs, y);
					qr_mc.lineTo(x + cs, y + cs);
					qr_mc.lineTo(x, y + cs);
					qr_mc.endFill();
				}
			}
		}
		
		return qr_mc;
	},

	setupTimingPattern : function() {
		
		for (var r = 8; r < this.moduleCount - 8; r++) {
			if (this.modules[r][6] !== null) {
				continue;
			}
			this.modules[r][6] = (r % 2 === 0);
		}
	
		for (var c = 8; c < this.moduleCount - 8; c++) {
			if (this.modules[6][c] !== null) {
				continue;
			}
			this.modules[6][c] = (c % 2 === 0);
		}
	},
	
	setupPositionAdjustPattern : function() {
	
		var pos = QRUtil.getPatternPosition(this.typeNumber);
		
		for (var i = 0; i < pos.length; i++) {
		
			for (var j = 0; j < pos.length; j++) {
			
				var row = pos[i];
				var col = pos[j];
				
				if (this.modules[row][col] !== null) {
					continue;
				}
				
				for (var r = -2; r <= 2; r++) {
				
					for (var c = -2; c <= 2; c++) {
					
						if (Math.abs(r) === 2 || 
                            Math.abs(c) === 2 ||
                            (r === 0 && c === 0) ) {
							this.modules[row + r][col + c] = true;
						} else {
							this.modules[row + r][col + c] = false;
						}
					}
				}
			}
		}
	},
	
	setupTypeNumber : function(test) {
	
		var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
        var mod;
	
		for (var i = 0; i < 18; i++) {
			mod = (!test && ( (bits >> i) & 1) === 1);
			this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
		}
	
		for (var x = 0; x < 18; x++) {
			mod = (!test && ( (bits >> x) & 1) === 1);
			this.modules[x % 3 + this.moduleCount - 8 - 3][Math.floor(x / 3)] = mod;
		}
	},
	
	setupTypeInfo : function(test, maskPattern) {
	
		var data = (this.errorCorrectLevel << 3) | maskPattern;
		var bits = QRUtil.getBCHTypeInfo(data);
        var mod;
	
		// vertical		
		for (var v = 0; v < 15; v++) {
	
			mod = (!test && ( (bits >> v) & 1) === 1);
	
			if (v < 6) {
				this.modules[v][8] = mod;
			} else if (v < 8) {
				this.modules[v + 1][8] = mod;
			} else {
				this.modules[this.moduleCount - 15 + v][8] = mod;
			}
		}
	
		// horizontal
		for (var h = 0; h < 15; h++) {
	
			mod = (!test && ( (bits >> h) & 1) === 1);
			
			if (h < 8) {
				this.modules[8][this.moduleCount - h - 1] = mod;
			} else if (h < 9) {
				this.modules[8][15 - h - 1 + 1] = mod;
			} else {
				this.modules[8][15 - h - 1] = mod;
			}
		}
	
		// fixed module
		this.modules[this.moduleCount - 8][8] = (!test);
	
	},
	
	mapData : function(data, maskPattern) {
		
		var inc = -1;
		var row = this.moduleCount - 1;
		var bitIndex = 7;
		var byteIndex = 0;
		
		for (var col = this.moduleCount - 1; col > 0; col -= 2) {
	
			if (col === 6) col--;
	
			while (true) {
	
				for (var c = 0; c < 2; c++) {
					
					if (this.modules[row][col - c] === null) {
						
						var dark = false;
	
						if (byteIndex < data.length) {
							dark = ( ( (data[byteIndex] >>> bitIndex) & 1) === 1);
						}
	
						var mask = QRUtil.getMask(maskPattern, row, col - c);
	
						if (mask) {
							dark = !dark;
						}
						
						this.modules[row][col - c] = dark;
						bitIndex--;
	
						if (bitIndex === -1) {
							byteIndex++;
							bitIndex = 7;
						}
					}
				}
								
				row += inc;
	
				if (row < 0 || this.moduleCount <= row) {
					row -= inc;
					inc = -inc;
					break;
				}
			}
		}
		
	}

};

QRCode.PAD0 = 0xEC;
QRCode.PAD1 = 0x11;

QRCode.createData = function(typeNumber, errorCorrectLevel, dataList) {
	
	var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
	
	var buffer = new QRBitBuffer();
	
	for (var i = 0; i < dataList.length; i++) {
		var data = dataList[i];
		buffer.put(data.mode, 4);
		buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
		data.write(buffer);
	}

	// calc num max data.
	var totalDataCount = 0;
	for (var x = 0; x < rsBlocks.length; x++) {
		totalDataCount += rsBlocks[x].dataCount;
	}

	if (buffer.getLengthInBits() > totalDataCount * 8) {
		throw new Error("code length overflow. (" + 
            buffer.getLengthInBits() + 
            ">" +  
            totalDataCount * 8 + 
            ")");
	}

	// end code
	if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
		buffer.put(0, 4);
	}

	// padding
	while (buffer.getLengthInBits() % 8 !== 0) {
		buffer.putBit(false);
	}

	// padding
	while (true) {
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD0, 8);
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD1, 8);
	}

	return QRCode.createBytes(buffer, rsBlocks);
};

QRCode.createBytes = function(buffer, rsBlocks) {

	var offset = 0;
	
	var maxDcCount = 0;
	var maxEcCount = 0;
	
	var dcdata = new Array(rsBlocks.length);
	var ecdata = new Array(rsBlocks.length);
	
	for (var r = 0; r < rsBlocks.length; r++) {

		var dcCount = rsBlocks[r].dataCount;
		var ecCount = rsBlocks[r].totalCount - dcCount;

		maxDcCount = Math.max(maxDcCount, dcCount);
		maxEcCount = Math.max(maxEcCount, ecCount);
		
		dcdata[r] = new Array(dcCount);
		
		for (var i = 0; i < dcdata[r].length; i++) {
			dcdata[r][i] = 0xff & buffer.buffer[i + offset];
		}
		offset += dcCount;
		
		var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
		var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);

		var modPoly = rawPoly.mod(rsPoly);
		ecdata[r] = new Array(rsPoly.getLength() - 1);
		for (var x = 0; x < ecdata[r].length; x++) {
            var modIndex = x + modPoly.getLength() - ecdata[r].length;
			ecdata[r][x] = (modIndex >= 0)? modPoly.get(modIndex) : 0;
		}

	}
	
	var totalCodeCount = 0;
	for (var y = 0; y < rsBlocks.length; y++) {
		totalCodeCount += rsBlocks[y].totalCount;
	}

	var data = new Array(totalCodeCount);
	var index = 0;

	for (var z = 0; z < maxDcCount; z++) {
		for (var s = 0; s < rsBlocks.length; s++) {
			if (z < dcdata[s].length) {
				data[index++] = dcdata[s][z];
			}
		}
	}

	for (var xx = 0; xx < maxEcCount; xx++) {
		for (var t = 0; t < rsBlocks.length; t++) {
			if (xx < ecdata[t].length) {
				data[index++] = ecdata[t][xx];
			}
		}
	}

	return data;

};

module.exports = QRCode;

    }
    };
    var cache = {};
    function localRequire(path) {
        var name = path.replace(/^\.\//, '');
        if (!factories[name]) throw new Error('QR module unavailable: ' + name);
        if (!cache[name]) {
            var module = { exports: {} };
            cache[name] = module;
            factories[name](module, module.exports, localRequire);
        }
        return cache[name].exports;
    }
    var QRCode = localRequire('index');
    return {
        svg: function(value) {
            var code = new QRCode(0, 1); // Error correction L (large AWG profiles)
            code.addData(value);
            code.make();
            var n = code.getModuleCount();
            var path = [];
            for (var r = 0; r < n; r++) {
                for (var c = 0; c < n; c++) {
                    if (code.isDark(r, c)) path.push('M' + (c + 4) + ' ' + (r + 4) + 'h1v1h-1z');
                }
            }
            return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + (n + 8) + ' ' + (n + 8) + '" shape-rendering="crispEdges">' +
                '<rect width="100%" height="100%" fill="white"/><path fill="black" d="' + path.join('') + '"/></svg>';
        }
    };
})();

var NAMES = {
    'Prague': 'Prague',
    'vps2_reality': 'VPS2 Reality',
    'Zurich': 'Zurich',
    'wgkir_AWG': 'wgkir_AWG',
    'awg_home': 'AWG Home',
    'awg_guest': 'AWG Guest'
};

function button(label, handler, extraClass) {
    return E('button', {
        'type': 'button',
        'class': 'cbi-button ' + (extraClass || 'cbi-button-action'),
        'click': handler
    }, [ label ]);
}

function section(title, children) {
    return E('div', { 'class': 'cbi-section', 'style': 'padding: 10px 14px; margin: 14px 0; border-radius:8px' },
        [ E('h3', {}, [title]) ].concat(children));
}

function label(text, good) {
    return E('span', {
        'style': 'padding:3px 8px;display:inline-block;border-radius:12px;background:' +
            (good ? '#d7f5dc;color:#116729' : '#e9ecf1;color:#374151')
    }, [text]);
}

function fmtTime(seconds) {
    if (!seconds || seconds < 1) return '—';
    return new Date(seconds * 1000).toLocaleString();
}

function fmtBytes(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KiB';
    if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MiB';
    return (n / 1073741824).toFixed(2) + ' GiB';
}

function showProfile(name, profile) {
    var area = E('textarea', {
        'readonly': 'readonly', 'rows': 12, 'spellcheck': 'false',
        'style': 'width:100%;font-family:monospace;max-height:35vh'
    }, [profile]);
    var image;
    try {
        var svg = qrCodeLocal.svg(profile);
        image = E('img', {
            'src': 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
            'alt': 'QR-код профиля ' + name,
            'style': 'width:360px;max-width:90%;height:auto;background:#fff;padding:8px;border:1px solid #ddd;image-rendering:pixelated'
        });
    } catch (err) {
        image = E('p', {}, ['QR-код не создан: ' + err.message + '. Конфигурацию можно скопировать.']);
    }
    var download = E('a', {
        'class': 'cbi-button cbi-button-action',
        'download': name + '.conf',
        'href': 'data:text/plain;charset=utf-8,' + encodeURIComponent(profile)
    }, ['Скачать .conf']);
    ui.showModal('Профиль AmneziaWG: ' + name, [
        E('p', {}, ['QR-код содержит приватный ключ. Открывайте его только в доверенном браузере.']),
        E('div', { 'style': 'text-align:center;margin:14px 0' }, [image]),
        E('details', {}, [E('summary', {}, ['Показать текст конфигурации']), area]),
        E('div', { 'class': 'right', 'style': 'display:flex;gap:8px;justify-content:flex-end;margin-top:12px' }, [
            download,
            button('Выделить конфигурацию', function() { area.focus(); area.select(); }),
            button('Закрыть', ui.hideModal, 'cbi-button-neutral')
        ])
    ]);
}

// For legacy clients the router does not have the client private key. The
// original .conf stays in the browser and is never sent through RPC.
function showImportedQR(peer) {
    var selected = peer || null;
    var area = E('textarea', {
        'rows': 11, 'spellcheck': 'false', 'autocomplete': 'off',
        'placeholder': '[Interface]\nPrivateKey = ...\nAddress = ...\n\n[Peer]\nPublicKey = ...',
        'style': 'width:100%;font-family:monospace'
    });
    var fileInput = E('input', {
        'type': 'file', 'accept': '.conf,text/plain',
        'style': 'display:block;margin:8px 0'
    });
    fileInput.addEventListener('change', function() {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        if (file.size > 32768) {
            ui.addNotification(null, E('p', {}, ['Файл профиля слишком большой.']), 'warning');
            return;
        }
        file.text().then(function(content) { area.value = content; }).catch(function(err) {
            ui.addNotification(null, E('p', {}, ['Ошибка чтения .conf: ' + err.message]), 'error');
        });
    });
    var displayName = selected ? selected.name : 'импортированный профиль';
    ui.showModal('QR: ' + displayName, [
        E('p', {}, ['Для ранее созданного клиента выберите его исходный .conf или вставьте текст. Конфигурация обрабатывается только в браузере, без передачи на роутер.']),
        fileInput,
        area,
        E('div', { 'class': 'right' }, [
            button('Показать QR', function() {
                var profile = area.value.trim();
                if (!/^\s*\[Interface\]/im.test(profile) ||
                    !/^\s*PrivateKey\s*=\s*\S+/im.test(profile) ||
                    !/^\s*\[Peer\]/im.test(profile) ||
                    !/^\s*PublicKey\s*=\s*\S+/im.test(profile)) {
                    ui.addNotification(null, E('p', {}, ['Нужен полный исходный AWG-профиль с приватным ключом.']), 'warning');
                    return;
                }
                if (selected && selected.allowed_ips) {
                    var expectedIp = String(selected.allowed_ips).split(/[\s,]+/)[0].split('/')[0];
                    var configured = profile.match(/^\s*Address\s*=\s*([^\r\n]+)/im);
                    var addresses = configured ? configured[1].split(/[\s,]+/).map(function(a) { return a.split('/')[0]; }) : [];
                    if (expectedIp && addresses.indexOf(expectedIp) < 0) {
                        ui.addNotification(null, E('p', {}, ['Адрес в .conf не соответствует выбранному клиенту (' + expectedIp + '). QR не сформирован.']), 'error');
                        return;
                    }
                }
                area.value = '';
                fileInput.value = '';
                showProfile(displayName, profile + '\n');
            }, 'cbi-button-positive'),
            button('Закрыть', function() { area.value = ''; fileInput.value = ''; ui.hideModal(); }, 'cbi-button-neutral')
        ])
    ]);
}

return view.extend({
    load: function() {
        return Promise.all([callStatus(), callPeers('awg_home'), callPeers('awg_guest')]);
    },

    notifyResult: function(result, successText) {
        if (result && result.ok) {
            ui.addNotification(null, E('p', {}, [successText || result.message || 'Готово']), 'info');
            return true;
        }
        ui.addNotification(null, E('p', {}, [(result && result.error) || 'Операция не выполнена']), 'error');
        return false;
    },

    refresh: function() {
        var self = this;
        return self.load().then(function(data) {
            dom.content(self.container, self.build(data));
        }).catch(function(err) {
            ui.addNotification(null, E('p', {}, ['Ошибка RPC: ' + err.message]), 'error');
        });
    },

    handleUpgrade: function() {
        var self = this;
        if (!window.confirm('Обновить Mandarin Manager из GitHub? Настройки AWG, Tachyon и firewall не изменяются.')) return;
        ui.addNotification(null, E('p', {}, ['Получаем обновление с GitHub и проверяем SHA-256...']), 'info');
        return callUpgrade().then(function(res) {
            if (self.notifyResult(res, 'Обновление установлено. Через несколько секунд обновите страницу (Ctrl+F5).')) {
                ui.addNotification(null, E('p', {}, ['Версия: ' + (res.version || 'обновлена')]), 'info');
            }
        }).catch(function(err) {
            ui.addNotification(null, E('p', {}, ['Ошибка обновления: ' + err.message]), 'error');
        });
    },

    handleGuestDiagnose: function() {
        return callGuestDiagnose().then(function(res) {
            var area = E('textarea', { 'readonly':'readonly', 'style':'width:100%;min-height:340px' });
            area.value = (res && res.details) || (res && res.error) || 'Диагностика не вернула данные';
            ui.showModal('Диагностика AWG Guest', [area, button('Закрыть', ui.hideModal, 'cbi-button-neutral')]);
        });
    },

    handleCreate: function() {
        var self = this;
        var name = this.nameField.value.trim();
        if (!/^[a-zA-Z0-9_-]{1,32}$/.test(name)) {
            ui.addNotification(null, E('p', {}, ['Имя: только латинские буквы, цифры, _ и -, до 32 символов.']), 'warning');
            return;
        }
        return callCreate(name).then(function(res) {
            if (self.notifyResult(res, 'Гостевой клиент создан')) {
                if (res.profile) showProfile(name, res.profile);
                return self.refresh();
            }
        });
    },

    handleCreateHome: function() {
        var self = this;
        var name = this.homeNameField.value.trim();
        if (!/^[a-zA-Z0-9_-]{1,32}$/.test(name)) {
            ui.addNotification(null, E('p', {}, ['Имя Home: латиница, цифры, _ и -, до 32 символов.']), 'warning');
            return;
        }
        return callCreateHome(name).then(function(res) {
            if (self.notifyResult(res, 'Новый клиент Home создан')) {
                if (res.profile) showProfile(name + ' (AWG Home)', res.profile);
                return self.refresh();
            }
        });
    },

    handleMigrationPrepare: function(source, peer) {
        var self = this;
        var target = source === 'awg_home' ? 'awg_guest' : 'awg_home';
        var proposed = (peer.name || '').replace(/[^a-zA-Z0-9_-]/g, '_').replace(/^_+/, '').slice(0, 32) || 'moved_client';
        var name = window.prompt('Новое имя в ' + (target === 'awg_guest' ? 'Guest' : 'Home') + ' (латиница, цифры, _, -):', proposed);
        if (name === null) return;
        name = name.trim();
        if (!/^[a-zA-Z0-9_-]{1,32}$/.test(name)) {
            ui.addNotification(null, E('p', {}, ['Неверное имя нового профиля.']), 'error');
            return;
        }
        if (!window.confirm('Создать НОВЫЙ профиль в ' + target + '? Старое подключение останется активным до подтверждённого подключения нового.')) return;
        return callMigrationPrepare(source, peer.section, name).then(function(res) {
            if (self.notifyResult(res, 'Профиль подготовлен; старый клиент пока работает')) {
                if (res.profile) showProfile(name + ' (' + target + ')', res.profile);
                return self.refresh();
            }
        });
    },

    handleMigrationAction: function(action, target, name) {
        var self = this;
        if (action === 'finish') {
            if (!window.confirm('Завершить перенос ' + name + '? Старый peer будет отключён, но его UCI-запись сохранится для отката.')) return;
        } else if (!window.confirm('Отменить перенос? Новый профиль будет удалён; старый останется рабочим.')) return;
        var fn = action === 'finish' ? callMigrationFinish : callMigrationCancel;
        return fn(target, name).then(function(res) {
            if (self.notifyResult(res)) return self.refresh();
        });
    },

    handleAction: function(action, name, iface) {
        var self = this;
        if (action === 'profile') {
            return callManagedProfile(iface || 'awg_guest', name).then(function(res) {
                if (res && res.ok && res.profile) showProfile(name, res.profile);
                else showImportedQR({ name: name });
            }).catch(function() { showImportedQR({ name: name }); });
        }
        if (action === 'delete' && !window.confirm('Отозвать доступ ' + name + ' навсегда?'))
            return;
        var fn = action === 'enable' ? callEnable : (action === 'disable' ? callDisable : callDelete);
        return fn(name).then(function(res) {
            if (self.notifyResult(res)) return self.refresh();
        });
    },

    renderPeerTable: function(interfaceName, data, writable) {
        var self = this;
        var peers = (data && data.peers) || [];
        if (!peers.length) return E('p', {}, ['Клиенты не найдены.']);
        var table = E('table', { 'class': 'table', 'style': 'width:100%' }, [
            E('tr', { 'class': 'tr table-titles' }, [
                E('th', { 'class': 'th' }, ['Клиент']),
                E('th', { 'class': 'th' }, ['Адрес']),
                E('th', { 'class': 'th' }, ['Состояние']),
                E('th', { 'class': 'th' }, ['Последнее соединение']),
                E('th', { 'class': 'th' }, ['Трафик']),
                E('th', { 'class': 'th' }, ['Управление'])
            ])
        ]);
        peers.forEach(function(p) {
            var actions = [];
            if (!p.has_endpoint) {
                actions.push(button(p.manageable ? 'QR / профиль' : 'QR из .conf', function() {
                    if (p.manageable) return self.handleAction('profile', p.name, interfaceName);
                    return showImportedQR(p);
                }));
            }
            if (p.migration_from) {
                actions.push(button('Завершить перенос', function() { return self.handleMigrationAction('finish', interfaceName, p.name); }, 'cbi-button-positive'));
                actions.push(button('Отменить перенос', function() { return self.handleMigrationAction('cancel', interfaceName, p.name); }, 'cbi-button-negative'));
            } else if (p.enabled && !p.has_endpoint) {
                actions.push(button('Перенести в ' + (interfaceName === 'awg_home' ? 'Guest' : 'Home'),
                    function() { return self.handleMigrationPrepare(interfaceName, p); }));
            }
            if (writable && p.manageable && !p.migration_from) {
                actions.push(button(p.enabled ? 'Отключить' : 'Включить',
                    function() { return self.handleAction(p.enabled ? 'disable' : 'enable', p.name, interfaceName); }));
                actions.push(button('Удалить', function() { return self.handleAction('delete', p.name, interfaceName); }, 'cbi-button-negative'));
            } else if (!actions.length && p.has_endpoint) {
                actions.push(E('small', {}, ['Удалённый сервер / клиентский туннель']));
            } else if (!actions.length) {
                actions.push(E('small', {}, ['Только просмотр']));
            }
            table.appendChild(E('tr', { 'class': 'tr' }, [
                E('td', { 'class': 'td' }, [p.name]),
                E('td', { 'class': 'td' }, [p.allowed_ips || '—']),
                E('td', { 'class': 'td' }, [label(p.enabled ? 'Разрешён' : 'Отключён', p.enabled)]),
                E('td', { 'class': 'td' }, [fmtTime(p.latest_handshake)]),
                E('td', { 'class': 'td' }, [fmtBytes(p.rx_bytes) + ' / ' + fmtBytes(p.tx_bytes)]),
                E('td', { 'class': 'td' }, actions)
            ]));
        });
        return table;
    },

    build: function(data) {
        var self = this;
        var status = data[0] || {};
        var home = data[1] || {};
        var guest = data[2] || {};
        var ifaces = status.interfaces || [];
        var byName = {};
        ifaces.forEach(function(i) { byName[i.name] = i; });
        var tv = status.tachyon || {};
        var children = [
            E('p', {}, ['Mandarin Manager ' + (status.version || '') + ' · мониторинг VPN и локальное управление AWG Home/Guest.']),
            E('div', { 'style': 'margin:8px 0' }, [button('Обновить данные', function() { return self.refresh(); }), button('Обновить приложение из GitHub', function() { return self.handleUpgrade(); }, 'cbi-button-positive')])
        ];
        if (tv.configured) {
            var nodes = tv.nodes || [];
            var groupTable = E('table', { 'class': 'table', 'style': 'width:100%' }, [
                E('tr', { 'class': 'tr table-titles' }, [
                    E('th', { 'class': 'th' }, ['Узел']),
                    E('th', { 'class': 'th' }, ['Подключение']),
                    E('th', { 'class': 'th' }, ['Задержка']),
                    E('th', { 'class': 'th' }, ['Выбор URLTest'])
                ])
            ]);
            nodes.forEach(function(n) {
                groupTable.appendChild(E('tr', { 'class': 'tr' }, [
                    E('td', { 'class': 'td' }, [E('strong', {}, [n.name || n.tag]),
                        E('div', { 'style':'font-size:.85em;opacity:.65' }, [n.tag])]),
                    E('td', { 'class': 'td' }, [n.interface ? 'AWG / ' + n.interface : (n.type || '—')]),
                    E('td', { 'class': 'td' }, [n.delay_ms > 0 ? n.delay_ms + ' мс' : 'Нет измерения']),
                    E('td', { 'class': 'td' }, [label(n.selected ? 'Выбран' : 'Резерв / кандидат', n.selected)])
                ]));
            });
            var z = tv.zapret2 || {};
            var engineRows = [
                E('p', {}, ['Ядро Tachyon: ', label(tv.running ? 'работает' : 'не работает', tv.running),
                    ' · DNS: ', label(tv.dns_configured ? 'настроен' : 'не подтверждён', tv.dns_configured),
                    ' · Узлов в URLTest: ' + nodes.length]),
                E('p', {}, ['Активный выход: ' + (tv.selected || 'не определён')]),
                groupTable,
                E('p', {}, ['Zapret2: ', label(z.ready ? 'готов' : 'требует проверки', z.ready),
                    ' · процессов nfqws2: ' + (z.running_process_count || 0) +
                    ' · NFQUEUE ' + (z.queue_base || '—') + ': ' + (z.nft_queue_rules || 0) + ' правил']),
                E('p', {}, ['Ошибка main: ' + ((tv.errors && tv.errors.main) || 'нет')])
            ];
            if (!nodes.length) engineRows.push(E('p', {}, ['URLTest не вернул узлы. Проверьте статус ядра Tachyon.']));
            children.push(section('Tachyon · исходящие VPN', engineRows));
        } else {
            var main = (status.outbounds || []).filter(function(x) { return x.tag === 'main-out'; })[0] || {};
            children.push(section('Исходящие VPN (старый Podkop)', [
                E('p', {}, ['Tachyon не обнаружен; показан только режим совместимости.']),
                E('p', {}, ['Группа main-out: ' + (main.type || 'не определена')]),
                E('p', {}, ['Основной: ' + (main.outbounds || []).join(', ') + ' · резервы: ' + (main.fallbacks || []).join(' → ')]),
                E('p', {}, ['sing-box: ' + (status.singbox_running ? 'запущен' : 'остановлен')])
            ]));
        }
        var homeInfo = byName.awg_home || {};
        var homeItems = [
            E('p', {}, ['Интерфейс: ' + (homeInfo.present ? 'найден' : 'не найден') +
                '; роль: ' + (homeInfo.mode === 'server' ? 'локальный сервер' : 'клиентский туннель или не настроен') +
                '. Перенос создаёт новый профиль; старый сохраняется до подтверждения подключения.'])
        ];
        if (homeInfo.present && homeInfo.mode === 'server') {
            this.homeNameField = E('input', { 'type':'text', 'placeholder':'home_iphone', 'style':'margin-right:10px' });
            homeItems.push(E('div', { 'style':'margin:10px 0' }, [
                E('strong', {}, ['Новый клиент Home: ']), this.homeNameField,
                button('Добавить в Home и показать QR', function() { return self.handleCreateHome(); }, 'cbi-button-positive')
            ]));
        }
        homeItems.push(E('div', { 'style': 'margin:8px 0' }, [button('QR из моего .conf', showImportedQR)]));
        homeItems.push(self.renderPeerTable('awg_home', home, false));
        children.push(section('AWG Home', homeItems));
        var guestInfo = byName.awg_guest || {};
        var guestItems = [
            E('p', {}, ['Интерфейс: ' + (guestInfo.present ? 'есть' : 'ещё не создан') +
                '. ' + (tv.configured ? 'Tachyon перехватывает его трафик: ' + (tv.guest_tachyon_source ? 'да' : 'нет') : 'Podkop перехватывает его трафик: ' + (status.guest_podkop_source ? 'да' : 'нет'))]),
            E('p', {}, ['Подключение гостей непосредственно к Mandarin. LAN и администрирование изолируются отдельной firewall-зоной.'])
        ];
        if (guestInfo.present && guestInfo.mode === 'server') {
            this.nameField = E('input', { 'type':'text', 'placeholder':'guest_iphone', 'style':'margin-right:10px' });
            guestItems.push(E('div', { 'style':'margin:10px 0' }, [
                E('strong', {}, ['Новый клиент: ']), this.nameField,
                button('Создать и получить конфигурацию', function() { return self.handleCreate(); }, 'cbi-button-positive')
            ]));
        } else {
            guestItems.push(E('p', {}, [
                'Сначала подготовь awg_guest командой mandarin-vpn-guest-prepare --endpoint ИМЯ_ИЛИ_IP. ',
                'Она создаёт конфигурацию; применение выполняется отдельно после проверки.'
            ]));
        }
        guestItems.push(button('QR из моего .conf', showImportedQR));
        guestItems.push(button('Диагностика Guest', function() { return self.handleGuestDiagnose(); }));
        guestItems.push(self.renderPeerTable('awg_guest', guest, true));
        children.push(section('AWG Guest', guestItems));
        children.push(E('p', { 'style': 'opacity:.75' }, [
            'При переносе Home ↔ Guest создаются новые ключи и QR. Старый peer отключается только после успешного рукопожатия нового. Резервная копия UCI сохраняется на роутере.'
        ]));
        return children;
    },

    render: function(data) {
        this.container = E('div', { 'class': 'cbi-map' });
        dom.content(this.container, this.build(data));
        return this.container;
    },

    handleSaveApply: null,
    handleSave: null,
    handleReset: null
});
