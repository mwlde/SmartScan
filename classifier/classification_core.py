import torch
import torch.nn as nn
from torchvision import transforms, models
from pil import Image
import numpy as np

CLASSES = ['handwritten', 'invoice', 'form', 'printed_page']

# preprocessing pipeline that every image goes through before hitting the model
# resize to 224x224 (what mobilenet expects), convert to tensor, then normalize
# the mean/std values are the imagenet ones, has to match exactly what was used during training
_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

_model = None

# loads the model from disk the first time its needed, then keeps it in memory
# avoids reloading the weights on every request which would be super slow
def _get_model(model_path='models/document_classifier_v2.pt'):
    global _model
    if _model is None:
        m = models.mobilenet_v2(weights=None)
        m.classifier = nn.Sequential(
            nn.Dropout(p=0.3),
            nn.Linear(m.last_channel, len(CLASSES))
        )
        m.load_state_dict(torch.load(model_path, map_location='cpu'))
        m.eval()
        _model = m
        print(f'[classification_core] model loaded from {model_path}')
    return _model

# converts whatever image thingy gets passed in into a pil RGB image that the transform can handle
# supports pil images, numpy arrays (rgb or bgr), and file paths
# the bgr flip is needed bc opencv loads images in bgr order but pil expects rgb
def _to_pil(image):
    if isinstance(image, Image.Image):
        return image.convert('RGB')
    if isinstance(image, np.ndarray):
        if image.ndim == 3 and image.shape[2] == 3:
            image = image[:, :, ::-1]   # opencv loads bgr, pil expects rgb, flip channel order
        return Image.fromarray(image.astype('uint8')).convert('RGB')
    if isinstance(image, str):
        return Image.open(image).convert('RGB')
    raise TypeError(f'unsupported image type: {type(image)}')

# the main function, runs the image through the model and returns the predicted class and confidence
# torch.no_grad() stops it from computing gradients which we dont need for inference, saves memory
def classify_document(image, model_path='models/document_classifier_v2.pt'):
    """runs inference, returns (class_name, confidence) e.g. ('invoice', 0.97)"""
    model  = _get_model(model_path)
    tensor = _transform(_to_pil(image)).unsqueeze(0)
    with torch.no_grad():
        probs      = torch.softmax(model(tensor), dim=1)
        conf, pred = probs.max(1)
    return CLASSES[pred.item()], round(conf.item(), 4)
